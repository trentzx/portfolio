import { useEffect, useRef } from 'react';

/*
 * ASCII koi pond.
 *
 * Each koi is generated once as a bitmap in its own local space (body profile,
 * fins, dorsal ridge, barbels, outline, markings, eyes), then rasterised onto
 * the page-wide character grid every frame by inverse-rotating each cell back
 * into sprite space. That keeps the glyph grid globally aligned while the fish
 * sit at arbitrary angles, instead of rotating a sprite as one image.
 *
 * The lateral offset applied during that inverse mapping is what makes the body
 * undulate: shifting a row sideways as a function of how far along the body it
 * sits bends the whole fish, so it swims rather than slides.
 *
 * Draw calls are bucketed by colour. fillStyle churn, not fillText, is what
 * makes a grid this dense expensive, so the flush changes it about a dozen
 * times a frame rather than thousands.
 */

const CELL = 8;
const FPS_CAP = 30;
const SHADOW = 'rgba(96, 118, 108, 0.3)';
const WATER = 'rgba(150, 196, 200, 0.13)';
const EYE_COLOR = 'rgba(16, 20, 22, 0.95)';
const SHADOW_OFFSET = 3;

// Cell kinds inside a sprite.
const EMPTY = 0;
const BODY = 1;
const PATCH = 2;
const FIN = 3;
const EYE = 4;
const EDGE = 5;
const DORSAL = 6;
const SCALE = 7;
const RAY = 8;
const SUMI = 9;
const MOUTH = 10;

const BODY_GLYPHS = '#%@&8B';
const FIN_GLYPHS = '+:*=.';
const WATER_GLYPHS = '·~-';
/* One table so a queued cell carries an absolute glyph index and the flush
   never has to work out which set a colour belonged to. */
const GLYPHS = BODY_GLYPHS + FIN_GLYPHS + WATER_GLYPHS;
const FIN_AT = BODY_GLYPHS.length;
const WATER_AT = FIN_AT + FIN_GLYPHS.length;

type Variety = {
  base: string;
  patch: string;
  fin: string;
  edge: string;
  dorsal: string;
  scale: string;
  ray: string;
  sumi: string;
  blotches: number;
  sumiSpots: number;
};

const VARIETIES: Variety[] = [
  {
    // kohaku: white with red markings
    base: 'rgba(242, 238, 228, 0.97)',
    patch: 'rgba(206, 62, 42, 0.97)',
    fin: 'rgba(126, 144, 136, 0.72)',
    edge: 'rgba(146, 140, 128, 0.9)',
    dorsal: 'rgba(206, 200, 188, 0.95)',
    scale: 'rgba(214, 209, 197, 0.95)',
    ray: 'rgba(168, 184, 176, 0.6)',
    sumi: 'rgba(38, 40, 42, 0.85)',
    sumiSpots: 2,
    blotches: 3,
  },
  {
    // ogon: solid gold
    base: 'rgba(221, 166, 60, 0.97)',
    patch: 'rgba(186, 128, 32, 0.97)',
    fin: 'rgba(130, 136, 110, 0.72)',
    edge: 'rgba(148, 110, 38, 0.9)',
    dorsal: 'rgba(196, 146, 50, 0.95)',
    scale: 'rgba(198, 146, 48, 0.95)',
    ray: 'rgba(172, 176, 148, 0.6)',
    sumi: 'rgba(120, 82, 20, 0.8)',
    sumiSpots: 0,
    blotches: 1,
  },
  {
    // asagi: steel blue with red
    base: 'rgba(143, 180, 214, 0.97)',
    patch: 'rgba(196, 85, 60, 0.95)',
    fin: 'rgba(110, 134, 144, 0.72)',
    edge: 'rgba(97, 126, 154, 0.9)',
    dorsal: 'rgba(120, 156, 190, 0.95)',
    scale: 'rgba(124, 160, 194, 0.95)',
    ray: 'rgba(150, 174, 184, 0.6)',
    sumi: 'rgba(32, 48, 66, 0.85)',
    sumiSpots: 1,
    blotches: 2,
  },
  {
    // shiro: white with charcoal
    base: 'rgba(244, 242, 236, 0.97)',
    patch: 'rgba(48, 52, 54, 0.92)',
    fin: 'rgba(124, 136, 132, 0.72)',
    edge: 'rgba(145, 152, 148, 0.9)',
    dorsal: 'rgba(210, 208, 202, 0.95)',
    scale: 'rgba(216, 214, 206, 0.95)',
    ray: 'rgba(166, 178, 174, 0.6)',
    sumi: 'rgba(30, 32, 34, 0.88)',
    sumiSpots: 2,
    blotches: 2,
  },
];

type Sprite = { w: number; h: number; cells: Uint8Array };

type Koi = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  cruise: number;
  burst: number;
  target: number;
  turnRate: number;
  nextTurn: number;
  swim: number;
  amp: number;
  sprite: Sprite;
  variety: Variety;
};

/** Builds one koi bitmap, nose at row 0, pointing toward +y. */
function buildSprite(len: number, variety: Variety): Sprite {
  const maxHW = Math.max(2, len * 0.15);
  const w = Math.ceil(maxHW * 2 + 7);
  const h = len;
  const cells = new Uint8Array(w * h);
  const cx = (w - 1) / 2;

  const halfWidthAt = (u: number) =>
    maxHW * Math.max(0.2, Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * u)), 0.62));

  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    if (t <= 0.8) {
      const u = t / 0.8;
      const hw = halfWidthAt(u);
      for (let x = 0; x < w; x++) {
        if (Math.abs(x - cx) <= hw) cells[y * w + x] = BODY;
      }
      // Pectoral fins, then pelvic: both sweep out from the body edge and
      // peak mid-fin so they taper at each end.
      for (const [from, to, reach] of [
        [0.2, 0.4, 1.05],
        [0.52, 0.66, 0.6],
      ]) {
        if (u > from && u < to) {
          const mid = (from + to) / 2;
          const fv = 1 - Math.abs((u - mid) / ((to - from) / 2));
          const out = hw + maxHW * reach * fv;
          for (let x = 0; x < w; x++) {
            const ad = Math.abs(x - cx);
            if (ad > hw && ad <= out && cells[y * w + x] === EMPTY) cells[y * w + x] = FIN;
          }
        }
      }
    } else {
      // Caudal fin: flares out, with a notch carved up the middle so it forks.
      const v = (t - 0.8) / 0.2;
      const hw = maxHW * (0.2 + 1.3 * v);
      const notch = maxHW * 1.1 * v * v;
      for (let x = 0; x < w; x++) {
        const ad = Math.abs(x - cx);
        if (ad <= hw && !(v > 0.26 && ad < notch)) cells[y * w + x] = FIN;
      }
    }
  }

  // Markings: a few soft blobs dropped along the spine.
  for (let i = 0; i < variety.blotches; i++) {
    const by = (0.1 + Math.random() * 0.6) * h;
    const bx = cx + (Math.random() - 0.5) * maxHW * 0.7;
    const br = maxHW * (0.7 + Math.random() * 0.85);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (cells[y * w + x] !== BODY) continue;
        const dx = x - bx;
        const dy = (y - by) * 0.55; // stretch along the body
        if (dx * dx + dy * dy <= br * br) cells[y * w + x] = PATCH;
      }
    }
  }

  // Sumi: smaller charcoal spots over the top, the way a sanke carries black
  // accents on a red-and-white body.
  for (let i = 0; i < variety.sumiSpots; i++) {
    const by = (0.18 + Math.random() * 0.5) * h;
    const bx = cx + (Math.random() - 0.5) * maxHW;
    const br = maxHW * (0.32 + Math.random() * 0.4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = cells[y * w + x];
        if (k !== BODY && k !== PATCH) continue;
        const dx = x - bx;
        const dy = (y - by) * 0.6;
        if (dx * dx + dy * dy <= br * br) cells[y * w + x] = SUMI;
      }
    }
  }

  // Scale texture: a diagonal lattice across the body, skipped on markings so
  // the patches stay solid and keep their shape.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cells[y * w + x] !== BODY) continue;
      if ((x + y) % 4 === 0 || (x - y + 64) % 7 === 0) cells[y * w + x] = SCALE;
    }
  }

  // Fin rays: alternating strands so fins read as webbed rather than solid.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cells[y * w + x] !== FIN) continue;
      if ((x + Math.round(y * 0.4)) % 3 === 0) cells[y * w + x] = RAY;
    }
  }

  // Outline: any body cell with an empty orthogonal neighbour. Gives the fish
  // a readable silhouette instead of a colour blob. Read from a snapshot so
  // freshly marked edges don't cascade inward.
  const snapshot = cells.slice();
  const solid = (x: number, y: number) =>
    x >= 0 && x < w && y >= 0 && y < h && snapshot[y * w + x] !== EMPTY;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = snapshot[y * w + x];
      if (k !== BODY && k !== PATCH && k !== SCALE && k !== SUMI) continue;
      if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) {
        cells[y * w + x] = EDGE;
      }
    }
  }

  // Dorsal ridge down the spine, plus barbels either side of the mouth.
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    if (t < 0.18 || t > 0.74) continue;
    const x = Math.round(cx);
    const k = cells[y * w + x];
    if (k === BODY || k === SCALE) cells[y * w + x] = DORSAL;
  }
  const by = Math.round(h * 0.035);
  for (const side of [-1, 1]) {
    const bx = Math.round(cx + side * (halfWidthAt(0.03) + 1));
    if (bx >= 0 && bx < w && cells[by * w + bx] === EMPTY) cells[by * w + bx] = FIN;
  }

  // Gill plate: a short arc behind the head, set in from the outline.
  const gy = Math.round(h * 0.19);
  const ghw = halfWidthAt(gy / (h - 1) / 0.8);
  for (let x = 0; x < w; x++) {
    const ad = Math.abs(x - cx);
    if (ad > ghw * 0.42 && ad < ghw * 0.82 && cells[gy * w + x] !== EMPTY) {
      cells[gy * w + x] = EDGE;
    }
  }

  // Mouth at the very nose.
  for (let x = 0; x < w; x++) {
    if (Math.abs(x - cx) <= 0.6 && cells[0 * w + x] !== EMPTY) cells[0 * w + x] = MOUTH;
  }

  // Eyes, just behind the nose.
  const ey = Math.round(h * 0.08);
  const ehw = halfWidthAt(ey / (h - 1) / 0.8);
  for (const side of [-1, 1]) {
    const ex = Math.round(cx + side * ehw * 0.62);
    if (ex >= 0 && ex < w && cells[ey * w + ex] !== EMPTY) cells[ey * w + ex] = EYE;
  }

  return { w, h, cells };
}

function makeKoi(cols: number, rows: number, seeded: boolean): Koi {
  const variety = VARIETIES[(Math.random() * VARIETIES.length) | 0];
  const len = Math.round(36 + Math.random() * 26);
  const angle = Math.random() * Math.PI * 2;
  const cruise = 15 + Math.random() * 11;
  return {
    x: seeded ? Math.random() * cols : cols / 2 - Math.sin(angle) * (cols / 2 + len),
    y: seeded ? Math.random() * rows : rows / 2 + Math.cos(angle) * (rows / 2 + len),
    angle,
    speed: cruise,
    cruise,
    burst: 2 + Math.random() * 6,
    target: angle,
    turnRate: 0.45 + Math.random() * 0.4,
    nextTurn: 1 + Math.random() * 4,
    swim: Math.random() * Math.PI * 2,
    amp: 1.1 + Math.random() * 1.2,
    sprite: buildSprite(len, variety),
    variety,
  };
}

export default function Pond() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const calm = matchMedia('(prefers-reduced-motion: reduce)');
    let cols = 0;
    let rows = 0;
    let koi: Koi[] = [];
    let raf = 0;
    let last = 0;
    let t = 0;

    // Reused per frame so the render path allocates nothing. Seeded in paint
    // order: a Map preserves insertion order, so water and shadows always flush
    // before any fish colour and therefore sit underneath.
    const buckets = new Map<string, number[]>();
    buckets.set(WATER, []);
    buckets.set(SHADOW, []);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textBaseline = 'top';
      cols = Math.ceil(w / CELL) + 2;
      rows = Math.ceil(h / CELL) + 2;
      const want = Math.max(4, Math.min(9, Math.round((cols * rows) / 3800)));
      koi = Array.from({ length: want }, () => makeKoi(cols, rows, true));
    };

    const push = (color: string, gx: number, gy: number, glyph: number) => {
      let b = buckets.get(color);
      if (!b) buckets.set(color, (b = []));
      b.push(gx, gy, glyph);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      buckets.forEach(b => (b.length = 0));

      // --- water ---
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const hash = ((x * 73856093) ^ (y * 19349663)) & 1023;
          const v =
            Math.sin(x * 0.21 + y * 0.14 + t * 0.5 + hash * 0.00614) +
            Math.sin(x * 0.08 - y * 0.25 + t * 0.28);
          if (v > 1.52) push(WATER, x, y, WATER_AT + (hash % WATER_GLYPHS.length));
        }
      }

      // --- koi ---
      for (const k of koi) {
        const { w: sw, h: sh, cells } = k.sprite;
        const scx = (sw - 1) / 2;
        const scy = (sh - 1) / 2;
        const cos = Math.cos(k.angle);
        const sin = Math.sin(k.angle);
        const reach = Math.ceil(Math.hypot(sw, sh) / 2) + 3;

        const gx0 = Math.max(0, Math.floor(k.x - reach));
        const gx1 = Math.min(cols - 1, Math.ceil(k.x + reach));
        const gy0 = Math.max(0, Math.floor(k.y - reach));
        const gy1 = Math.min(rows - 1, Math.ceil(k.y + reach));

        for (let gy = gy0; gy <= gy1; gy++) {
          for (let gx = gx0; gx <= gx1; gx++) {
            const dx = gx - k.x;
            const dy = gy - k.y;
            // Inverse-rotate this grid cell into the sprite's own space.
            const lx = dx * cos + dy * sin;
            const ly = -dx * sin + dy * cos;
            // Undulation: bend the body sideways by a travelling wave that
            // grows toward the tail, so the fish flexes instead of sliding.
            const along = (ly + scy) / sh;
            const wave = Math.sin(along * 7.2 - k.swim) * k.amp * along * along;
            const sx = Math.round(lx - wave + scx);
            const sy = Math.round(ly + scy);
            if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
            const kind = cells[sy * sw + sx];
            if (kind === EMPTY) continue;

            const hash = ((gx * 73856093) ^ (gy * 19349663)) & 1023;
            const glyph =
              kind === FIN || kind === RAY
                ? FIN_AT + (hash % FIN_GLYPHS.length)
                : hash % BODY_GLYPHS.length;
            push(SHADOW, gx + SHADOW_OFFSET, gy + SHADOW_OFFSET, glyph);

            if (kind === FIN) push(k.variety.fin, gx, gy, glyph);
            else if (kind === RAY) push(k.variety.ray, gx, gy, glyph);
            else if (kind === EYE || kind === MOUTH) push(EYE_COLOR, gx, gy, 0);
            else if (kind === EDGE) push(k.variety.edge, gx, gy, glyph);
            else if (kind === DORSAL) push(k.variety.dorsal, gx, gy, glyph);
            else if (kind === SCALE) push(k.variety.scale, gx, gy, glyph);
            else if (kind === SUMI) push(k.variety.sumi, gx, gy, glyph);
            else push(kind === PATCH ? k.variety.patch : k.variety.base, gx, gy, glyph);
          }
        }
      }

      // --- flush, one fillStyle change per colour ---
      buckets.forEach((b, color) => {
        if (!b.length) return;
        ctx.fillStyle = color;
        for (let i = 0; i < b.length; i += 3) {
          ctx.fillText(GLYPHS[b[i + 2]], b[i] * CELL, b[i + 1] * CELL);
        }
      });
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = now - last;
      if (dt < 1000 / FPS_CAP) return;
      last = now;
      const sec = Math.min(dt, 100) / 1000;
      t += sec;

      for (let i = 0; i < koi.length; i++) {
        const k = koi[i];

        // Heading is steered toward a target rather than oscillated. Rotating
        // every frame is what made them look like they were spinning in place;
        // a koi holds a line and then commits to a turn.
        const margin = 14;
        const nearEdge =
          k.x < margin || k.x > cols - margin || k.y < margin || k.y > rows - margin;
        if (nearEdge) {
          // Turn back toward open water. Heading convention: the fish travels
          // along (-sin a, cos a), so a heading for (dx, dy) is atan2(-dx, dy).
          k.target = Math.atan2(-(cols / 2 - k.x), rows / 2 - k.y);
          k.nextTurn = 1.5 + Math.random() * 2;
        } else {
          k.nextTurn -= sec;
          if (k.nextTurn <= 0) {
            k.target = k.angle + (Math.random() - 0.5) * 1.6;
            k.nextTurn = 2 + Math.random() * 5;
          }
        }

        // Steer along the shortest arc, capped so turns stay smooth.
        let diff = k.target - k.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const maxTurn = k.turnRate * sec;
        k.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

        // Speed pulses with the tail beat, the way a koi surges then glides,
        // and it slows a little through a turn.
        const turning = Math.min(1, Math.abs(diff));
        k.speed = (k.cruise + Math.sin(k.swim * 0.5) * k.burst * 0.3) * (1 - turning * 0.25);
        k.swim += (4 + k.speed * 0.2) * sec;
        k.x -= Math.sin(k.angle) * k.speed * sec;
        k.y += Math.cos(k.angle) * k.speed * sec;

        // Safety net only: edge steering should keep them in the pond.
        const pad = k.sprite.h * 1.5;
        if (k.x < -pad || k.x > cols + pad || k.y < -pad || k.y > rows + pad) {
          koi[i] = makeKoi(cols, rows, false);
        }
      }
      draw();
    };

    const start = () => {
      if (raf || calm.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    const onResize = () => {
      resize();
      draw();
    };
    const onCalmChange = () => {
      stop();
      resize();
      draw();
      start();
    };

    resize();
    draw();
    start();

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    calm.addEventListener('change', onCalmChange);
    return () => {
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      calm.removeEventListener('change', onCalmChange);
    };
  }, []);

  return <canvas className="pond" ref={ref} aria-hidden="true" />;
}

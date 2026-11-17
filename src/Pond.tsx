import { useEffect, useRef } from 'react';

/*
 * ASCII koi pond.
 *
 * Each koi is generated once as a small bitmap in its own local space (body
 * profile, fins, markings, eyes), then rasterised onto the page-wide character
 * grid every frame by inverse-rotating each cell back into sprite space. That
 * is what keeps the glyph grid globally aligned while the fish sit at arbitrary
 * angles, instead of the whole sprite rotating as one image.
 *
 * Draw calls are bucketed by colour so the canvas only changes fillStyle a
 * handful of times per frame; fillStyle churn, not fillText, is what makes a
 * grid this dense expensive.
 */

const CELL = 8;
const FPS_CAP = 30;

// Cell kinds inside a sprite.
const EMPTY = 0;
const BODY = 1;
const PATCH = 2;
const FIN = 3;
const EYE = 4;

const BODY_GLYPHS = '#%@&8B';
const FIN_GLYPHS = '+:*=.';
const WATER_GLYPHS = '·~-';
/* One table so a queued cell carries an absolute glyph index and the flush
   never has to work out which set a colour belonged to. */
const GLYPHS = BODY_GLYPHS + FIN_GLYPHS + WATER_GLYPHS;
const FIN_AT = BODY_GLYPHS.length;
const WATER_AT = FIN_AT + FIN_GLYPHS.length;

type Variety = { base: string; patch: string; fin: string; blotches: number };

const VARIETIES: Variety[] = [
  // kohaku: white with red markings
  { base: 'rgba(246, 243, 236, 0.98)', patch: 'rgba(199, 48, 34, 0.97)', fin: 'rgba(96, 116, 112, 0.72)', blotches: 3 },
  // ogon: solid gold
  { base: 'rgba(216, 158, 44, 0.97)', patch: 'rgba(178, 120, 26, 0.97)', fin: 'rgba(104, 118, 98, 0.72)', blotches: 1 },
  // asagi: steel blue with red
  { base: 'rgba(118, 152, 186, 0.97)', patch: 'rgba(186, 60, 44, 0.95)', fin: 'rgba(92, 114, 122, 0.72)', blotches: 2 },
  // shiro: white with charcoal
  { base: 'rgba(248, 246, 240, 0.98)', patch: 'rgba(42, 46, 48, 0.9)', fin: 'rgba(96, 110, 108, 0.72)', blotches: 2 },
];

type Sprite = { w: number; h: number; cells: Uint8Array };

type Koi = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  wander: number;
  wanderSpeed: number;
  sprite: Sprite;
  variety: Variety;
};

/** Builds one koi bitmap, nose at row 0, pointing toward +y. */
function buildSprite(len: number, variety: Variety): Sprite {
  const maxHW = Math.max(2, len * 0.15);
  const w = Math.ceil(maxHW * 2 + 5);
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
      // peak mid-fin so they taper at both ends.
      for (const [from, to, reach] of [
        [0.22, 0.4, 0.95],
        [0.54, 0.66, 0.55],
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
      const hw = maxHW * (0.2 + 1.25 * v);
      const notch = maxHW * 1.05 * v * v;
      for (let x = 0; x < w; x++) {
        const ad = Math.abs(x - cx);
        if (ad <= hw && !(v > 0.28 && ad < notch)) cells[y * w + x] = FIN;
      }
    }
  }

  // Markings: a few soft blobs dropped along the spine.
  for (let i = 0; i < variety.blotches; i++) {
    const bt = 0.1 + Math.random() * 0.6;
    const by = bt * h;
    const bx = cx + (Math.random() - 0.5) * maxHW * 0.7;
    const br = maxHW * (0.7 + Math.random() * 0.8);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (cells[y * w + x] !== BODY) continue;
        const dx = x - bx;
        const dy = (y - by) * 0.55; // stretch along the body
        if (dx * dx + dy * dy <= br * br) cells[y * w + x] = PATCH;
      }
    }
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
  const len = Math.round(36 + Math.random() * 24);
  const angle = Math.random() * Math.PI * 2;
  const margin = len;
  return {
    x: seeded ? Math.random() * cols : cols / 2 - Math.sin(angle) * (cols / 2 + margin),
    y: seeded ? Math.random() * rows : rows / 2 + Math.cos(angle) * (rows / 2 + margin),
    angle,
    speed: 2.6 + Math.random() * 3.4,
    wander: Math.random() * Math.PI * 2,
    wanderSpeed: 0.12 + Math.random() * 0.22,
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

    // Reused per frame so the render path allocates nothing.
    const buckets = new Map<string, number[]>();

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
      const want = Math.max(3, Math.min(7, Math.round((cols * rows) / 5200)));
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
          if (v > 1.52) push('rgba(70, 140, 165, 0.16)', x, y, WATER_AT + (hash % WATER_GLYPHS.length));
        }
      }

      // --- koi ---
      for (const k of koi) {
        const { w: sw, h: sh, cells } = k.sprite;
        const scx = (sw - 1) / 2;
        const scy = (sh - 1) / 2;
        const cos = Math.cos(k.angle);
        const sin = Math.sin(k.angle);
        const reach = Math.ceil(Math.hypot(sw, sh) / 2) + 1;

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
            const sx = Math.round(lx + scx);
            const sy = Math.round(ly + scy);
            if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
            const kind = cells[sy * sw + sx];
            if (kind === EMPTY) continue;
            const hash = ((gx * 73856093) ^ (gy * 19349663)) & 1023;
            if (kind === FIN) {
              push(k.variety.fin, gx, gy, FIN_AT + (hash % FIN_GLYPHS.length));
            } else if (kind === EYE) {
              push('rgba(28, 32, 34, 0.9)', gx, gy, 0);
            } else {
              push(
                kind === PATCH ? k.variety.patch : k.variety.base,
                gx,
                gy,
                hash % BODY_GLYPHS.length,
              );
            }
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
        k.wander += k.wanderSpeed * sec;
        k.angle += Math.sin(k.wander) * 0.35 * sec;
        // angle 0 swims "down" the grid, matching the sprite's nose-at-row-0.
        k.x += Math.sin(k.angle) * k.speed * sec * -1;
        k.y += Math.cos(k.angle) * k.speed * sec;
        const pad = k.sprite.h;
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

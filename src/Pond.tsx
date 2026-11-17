import { useEffect, useRef } from 'react';

/*
 * Koi pond.
 *
 * Each koi is generated once as a side-view bitmap in its own local space
 * (body profile, dorsal/anal/pectoral/caudal fins, gill, eye, markings), then
 * rasterised onto the page-wide cell grid every frame by inverse-rotating each
 * cell back into sprite space. That keeps the grid globally aligned while the
 * fish sit at arbitrary angles, instead of rotating a sprite as one image.
 *
 * Fish cells are drawn as filled squares so bodies read solid and crisp; the
 * water keeps ASCII glyphs. Movement is a small boids model, so the school
 * holds together and the fish look like they are going somewhere.
 */

const CELL = 8;
const FPS_CAP = 30;
const WATER = 'rgba(150, 196, 200, 0.13)';
const SHADOW = 'rgba(92, 112, 104, 0.3)';
const EYE_COLOR = 'rgba(14, 18, 20, 0.95)';
const SHADOW_OFFSET = 3;
const WATER_GLYPHS = '·~-';

// Cell kinds inside a sprite.
const EMPTY = 0;
const BODY = 1;
const PATCH = 2;
const FIN = 3;
const EYE = 4;
const EDGE = 5;
const SUMI = 6;
const BELLY = 7;

type Variety = {
  base: string;
  patch: string;
  fin: string;
  edge: string;
  belly: string;
  sumi: string;
  blotches: number;
  sumiSpots: number;
};

const VARIETIES: Variety[] = [
  {
    // kohaku: white with red markings
    base: 'rgb(238, 235, 228)',
    patch: 'rgb(198, 42, 32)',
    fin: 'rgb(214, 211, 203)',
    edge: 'rgb(150, 148, 142)',
    belly: 'rgb(208, 205, 198)',
    sumi: 'rgb(38, 40, 42)',
    blotches: 3,
    sumiSpots: 1,
  },
  {
    // ogon: solid gold
    base: 'rgb(222, 168, 54)',
    patch: 'rgb(196, 138, 34)',
    fin: 'rgb(206, 158, 56)',
    edge: 'rgb(140, 102, 30)',
    belly: 'rgb(198, 150, 52)',
    sumi: 'rgb(126, 88, 22)',
    blotches: 1,
    sumiSpots: 0,
  },
  {
    // asagi: steel blue with red
    base: 'rgb(142, 178, 212)',
    patch: 'rgb(192, 58, 44)',
    fin: 'rgb(186, 198, 210)',
    edge: 'rgb(84, 112, 142)',
    belly: 'rgb(206, 214, 222)',
    sumi: 'rgb(34, 50, 70)',
    blotches: 2,
    sumiSpots: 1,
  },
  {
    // shiro: white with charcoal
    base: 'rgb(242, 240, 234)',
    patch: 'rgb(48, 50, 52)',
    fin: 'rgb(218, 216, 210)',
    edge: 'rgb(148, 150, 146)',
    belly: 'rgb(212, 210, 204)',
    sumi: 'rgb(32, 34, 36)',
    blotches: 2,
    sumiSpots: 0,
  },
  {
    // budo: plum over white
    base: 'rgb(238, 234, 230)',
    patch: 'rgb(122, 58, 96)',
    fin: 'rgb(210, 202, 206)',
    edge: 'rgb(146, 140, 142)',
    belly: 'rgb(206, 200, 202)',
    sumi: 'rgb(58, 30, 48)',
    blotches: 3,
    sumiSpots: 0,
  },
];

type Sprite = { w: number; h: number; cells: Uint8Array };

type Koi = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  cruise: number;
  dart: number;
  turnRate: number;
  swim: number;
  amp: number;
  sprite: Sprite;
  variety: Variety;
};

/** Builds one koi bitmap in side view, nose at x=0, pointing toward +x. */
function buildSprite(len: number, variety: Variety): Sprite {
  const maxBH = Math.max(2, len * 0.105); // body half-height
  const w = len;
  const h = Math.ceil(maxBH * 4.6) + 2;
  const cells = new Uint8Array(w * h);
  const cy = (h - 1) / 2;

  const bodyHalf = (v: number) =>
    maxBH * Math.max(0.2, Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * v)), 0.5));

  const mark = (x: number, y0: number, y1: number, kind: number, onlyEmpty = false) => {
    for (let y = Math.max(0, Math.ceil(y0)); y <= Math.min(h - 1, Math.floor(y1)); y++) {
      if (!onlyEmpty || cells[y * w + x] === EMPTY) cells[y * w + x] = kind;
    }
  };

  for (let x = 0; x < w; x++) {
    const u = x / (w - 1);
    if (u <= 0.78) {
      const v = u / 0.78;
      const bh = bodyHalf(v);
      mark(x, cy - bh, cy + bh, BODY);

      // Dorsal fin along the back.
      if (v > 0.34 && v < 0.7) {
        const fv = Math.sin((Math.PI * (v - 0.34)) / 0.36);
        mark(x, cy - bh - maxBH * 1.15 * fv, cy - bh, FIN, true);
      }
      // Anal fin underneath, further back.
      if (v > 0.62 && v < 0.82) {
        const fv = Math.sin((Math.PI * (v - 0.62)) / 0.2);
        mark(x, cy + bh, cy + bh + maxBH * 0.65 * fv, FIN, true);
      }
      // Pectoral fin, sweeping down and back from behind the gill.
      if (v > 0.2 && v < 0.36) {
        const fv = Math.sin((Math.PI * (v - 0.2)) / 0.16);
        mark(x, cy + bh * 0.35, cy + bh + maxBH * 0.85 * fv, FIN, true);
      }
    } else {
      // Caudal fin: flares, with a notch carved through the middle so it forks.
      const v = (u - 0.78) / 0.22;
      const spread = maxBH * (0.22 + 1.75 * v);
      const notch = maxBH * 1.15 * v * v;
      for (let y = 0; y < h; y++) {
        const d = Math.abs(y - cy);
        if (d <= spread && !(v > 0.3 && d < notch)) cells[y * w + x] = FIN;
      }
    }
  }

  // Belly shading along the underside.
  for (let x = 0; x < w; x++) {
    const u = x / (w - 1);
    if (u > 0.78) continue;
    const bh = bodyHalf(u / 0.78);
    mark(x, cy + bh * 0.52, cy + bh, BELLY);
  }

  const blob = (kind: number, count: number, rad: number) => {
    for (let i = 0; i < count; i++) {
      const bx = (0.1 + Math.random() * 0.6) * w;
      const by = cy + (Math.random() - 0.5) * maxBH * 1.1;
      const br = maxBH * rad * (0.75 + Math.random() * 0.7);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const k = cells[y * w + x];
          if (k !== BODY && k !== BELLY && k !== PATCH) continue;
          const dx = (x - bx) * 0.62; // stretch along the body
          const dy = y - by;
          if (dx * dx + dy * dy <= br * br) cells[y * w + x] = kind;
        }
      }
    }
  };
  blob(PATCH, variety.blotches, 1.15);
  blob(SUMI, variety.sumiSpots, 0.6);

  // Outline: any solid body cell with an empty orthogonal neighbour, so each
  // fish keeps a readable silhouette against the water. Read from a snapshot so
  // freshly marked edges don't cascade inward. Fins are left alone; outlining
  // them would close up the gaps that make them look webbed.
  const snap = cells.slice();
  const solid = (x: number, y: number) =>
    x >= 0 && x < w && y >= 0 && y < h && snap[y * w + x] !== EMPTY;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = snap[y * w + x];
      if (k === EMPTY || k === FIN) continue;
      if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) {
        cells[y * w + x] = EDGE;
      }
    }
  }

  // Gill plate, then the eye and mouth up at the head.
  const gx = Math.round(w * 0.17);
  const gbh = bodyHalf(gx / (w - 1) / 0.78);
  mark(gx, cy - gbh * 0.7, cy + gbh * 0.7, EDGE);
  const ex = Math.round(w * 0.075);
  const ey = Math.round(cy - bodyHalf(ex / (w - 1) / 0.78) * 0.34);
  if (cells[ey * w + ex] !== EMPTY) cells[ey * w + ex] = EYE;
  const my = Math.round(cy);
  if (cells[my * w] !== EMPTY) cells[my * w] = EYE;

  return { w, h, cells };
}

function makeKoi(cols: number, rows: number, seeded: boolean): Koi {
  const variety = VARIETIES[(Math.random() * VARIETIES.length) | 0];
  const len = Math.round(26 + Math.random() * 16);
  const angle = Math.random() * Math.PI * 2;
  const cruise = 13 + Math.random() * 9;
  return {
    x: seeded ? Math.random() * cols : cols / 2 - Math.cos(angle) * (cols / 2 + len),
    y: seeded ? Math.random() * rows : rows / 2 - Math.sin(angle) * (rows / 2 + len),
    angle,
    speed: cruise,
    cruise,
    dart: 0,
    turnRate: 0.7 + Math.random() * 0.5,
    swim: Math.random() * Math.PI * 2,
    amp: 0.9 + Math.random() * 0.9,
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

    // Reused each frame so the render path allocates nothing. Seeded in paint
    // order: a Map keeps insertion order, so shadows always flush beneath the
    // fish colours that get added later.
    const cellBuckets = new Map<string, number[]>();
    const waterCells: number[] = [];
    cellBuckets.set(SHADOW, []);

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
      const want = Math.max(5, Math.min(12, Math.round((cols * rows) / 2300)));
      koi = Array.from({ length: want }, () => makeKoi(cols, rows, true));
    };

    const push = (color: string, gx: number, gy: number) => {
      let b = cellBuckets.get(color);
      if (!b) cellBuckets.set(color, (b = []));
      b.push(gx, gy);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cellBuckets.forEach(b => (b.length = 0));
      waterCells.length = 0;

      // --- water ---
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const hash = ((x * 73856093) ^ (y * 19349663)) & 1023;
          const v =
            Math.sin(x * 0.21 + y * 0.14 + t * 0.5 + hash * 0.00614) +
            Math.sin(x * 0.08 - y * 0.25 + t * 0.28);
          if (v > 1.52) waterCells.push(x, y, hash % WATER_GLYPHS.length);
        }
      }

      // --- koi ---
      for (const k of koi) {
        const { w: sw, h: sh, cells } = k.sprite;
        const scx = (sw - 1) / 2;
        const scy = (sh - 1) / 2;
        const cos = Math.cos(k.angle);
        const sin = Math.sin(k.angle);
        // A side-view fish must never swim upside down, so mirror it across its
        // own long axis once the heading passes vertical.
        const flip = cos < 0;
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
            let ly = -dx * sin + dy * cos;
            if (flip) ly = -ly;
            // Undulation: bend the body across its axis by a travelling wave
            // that grows toward the tail, so the fish flexes as it swims.
            const along = (lx + scx) / sw;
            const wave = Math.sin(along * 6.5 - k.swim) * k.amp * along * along;
            const sx = Math.round(lx + scx);
            const sy = Math.round(ly - wave + scy);
            if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
            const kind = cells[sy * sw + sx];
            if (kind === EMPTY) continue;

            push(SHADOW, gx + SHADOW_OFFSET, gy + SHADOW_OFFSET);
            if (kind === EYE) push(EYE_COLOR, gx, gy);
            else if (kind === FIN) push(k.variety.fin, gx, gy);
            else if (kind === EDGE) push(k.variety.edge, gx, gy);
            else if (kind === BELLY) push(k.variety.belly, gx, gy);
            else if (kind === PATCH) push(k.variety.patch, gx, gy);
            else if (kind === SUMI) push(k.variety.sumi, gx, gy);
            else push(k.variety.base, gx, gy);
          }
        }
      }

      // --- flush ---
      ctx.fillStyle = WATER;
      for (let i = 0; i < waterCells.length; i += 3) {
        ctx.fillText(
          WATER_GLYPHS[waterCells[i + 2]],
          waterCells[i] * CELL,
          waterCells[i + 1] * CELL,
        );
      }
      // Solid cells, one fillStyle change per colour. The 1px gap keeps the
      // grid visible between cells.
      cellBuckets.forEach((b, color) => {
        if (!b.length) return;
        ctx.fillStyle = color;
        for (let i = 0; i < b.length; i += 2) {
          ctx.fillRect(b[i] * CELL, b[i + 1] * CELL, CELL - 1, CELL - 1);
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

      const NEIGH2 = 44 * 44;
      const SEP2 = 17 * 17;

      for (let i = 0; i < koi.length; i++) {
        const k = koi[i];

        /*
         * Boids. Drifting was the symptom of every fish steering only by its
         * own random target: nothing in the scene related to anything else.
         * Alignment and cohesion give the school a shared intent, separation
         * stops them stacking up.
         */
        let sepX = 0;
        let sepY = 0;
        let aliX = 0;
        let aliY = 0;
        let cohX = 0;
        let cohY = 0;
        let n = 0;
        for (let j = 0; j < koi.length; j++) {
          if (j === i) continue;
          const o = koi[j];
          const dx = o.x - k.x;
          const dy = o.y - k.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > NEIGH2 || d2 === 0) continue;
          n++;
          cohX += dx;
          cohY += dy;
          aliX += Math.cos(o.angle);
          aliY += Math.sin(o.angle);
          if (d2 < SEP2) {
            const d = Math.sqrt(d2);
            sepX -= dx / d;
            sepY -= dy / d;
          }
        }

        let wx = Math.cos(k.angle) * 1.25;
        let wy = Math.sin(k.angle) * 1.25;
        if (n) {
          const cl = Math.hypot(cohX, cohY) || 1;
          wx += (cohX / cl) * 0.4 + (aliX / n) * 0.75 + sepX * 1.1;
          wy += (cohY / cl) * 0.4 + (aliY / n) * 0.75 + sepY * 1.1;
        }

        // Turn back toward open water before leaving the pond.
        const margin = 16;
        if (k.x < margin) wx += 1.6;
        if (k.x > cols - margin) wx -= 1.6;
        if (k.y < margin) wy += 1.6;
        if (k.y > rows - margin) wy -= 1.6;

        // Occasional dart, so the school isn't uniformly paced.
        k.dart -= sec;
        if (k.dart < -4 && Math.random() < 0.012) k.dart = 0.5 + Math.random() * 0.8;

        const target = Math.atan2(wy, wx);
        let diff = target - k.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const maxTurn = k.turnRate * sec;
        k.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

        const turning = Math.min(1, Math.abs(diff));
        const burst = k.dart > 0 ? 1.9 : 1;
        k.speed = k.cruise * burst * (1 - turning * 0.3);
        k.swim += (4 + k.speed * 0.3) * sec;
        k.x += Math.cos(k.angle) * k.speed * sec;
        k.y += Math.sin(k.angle) * k.speed * sec;

        // Safety net only: edge steering should keep them in the pond.
        const pad = k.sprite.w * 1.5;
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

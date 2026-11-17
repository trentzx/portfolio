import { useEffect, useRef } from 'react';

/*
 * ASCII koi pond.
 *
 * Every cell on screen is a text glyph. The water is a dense field whose
 * brightness comes from layered sines, stretched along x so the surface breaks
 * into horizontal streaks, darkened toward the middle so the pond reads as
 * deep. Shade is quantised into a handful of steps, which lets the whole field
 * flush with one fillStyle change per step rather than one per cell.
 *
 * The water layer is redrawn onto an offscreen canvas only every few frames
 * (it moves slowly) and blitted in between; the koi are redrawn every frame on
 * top. Without that split a full-screen glyph field is far too expensive.
 *
 * Koi are generated once as side-view bitmaps and rasterised by
 * inverse-rotating each grid cell back into sprite space, so the glyph grid
 * stays aligned while fish sit at any angle. They move as a boids school.
 */

const CELL = 7;
const FONT = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const FPS_CAP = 30;
const WATER_BANDS = 4; // water is refreshed one horizontal band per frame

// Shade ramp, dark pond floor through lit surface.
const RAMP: [number, number, number][] = [
  [62, 39, 33],
  [72, 45, 37],
  [84, 53, 42],
  [96, 61, 47],
  [110, 70, 52],
  [126, 81, 58],
  [144, 94, 65],
  [162, 108, 73],
  [182, 126, 84],
  [204, 150, 100],
  [226, 178, 122],
  [244, 210, 158],
];
const RAMP_GLYPHS = ['~', '~', '~', '~', '-', '~', '=', '~', 'o', '0', 'O', '0'];
const RAMP_CSS = RAMP.map(([r, g, b]) => `rgb(${r},${g},${b})`);
/* Solid pond surface painted under every glyph. Without it half the pixels on
   screen stay transparent and the field reads as noise on black rather than
   water: measured against the reference, luminance SD was 58 versus 30. */
const BASE = 'rgb(62,39,33)';
/* The darkest ramp steps draw nothing and let BASE show through, which keeps
   the surface calm and skips the majority of fillText calls. */
const RAMP_MIN_DRAW = 1;

const PAD_GREEN = ['rgb(34,78,44)', 'rgb(46,100,54)', 'rgb(62,124,66)'];
const PAD_GLYPHS = ['o', '0', '@'];
const BLOSSOM = 'rgb(226,150,170)';

// Cell kinds inside a koi sprite.
const EMPTY = 0;
const BODY = 1;
const PATCH = 2;
const FIN = 3;
const EYE = 4;
const EDGE = 5;

const KOI_GLYPHS = 'o0O8e&';
const FIN_GLYPHS = ':;.,';

type Variety = { base: string; patch: string; fin: string; edge: string; blotches: number };

const VARIETIES: Variety[] = [
  // kohaku
  {
    base: 'rgb(244,240,232)',
    patch: 'rgb(214,66,48)',
    fin: 'rgb(214,208,198)',
    edge: 'rgb(150,132,120)',
    blotches: 3,
  },
  // ogon
  {
    base: 'rgb(236,186,78)',
    patch: 'rgb(206,146,40)',
    fin: 'rgb(220,180,96)',
    edge: 'rgb(150,106,36)',
    blotches: 1,
  },
  // asagi
  {
    base: 'rgb(150,186,218)',
    patch: 'rgb(206,74,52)',
    fin: 'rgb(192,206,218)',
    edge: 'rgb(86,116,148)',
    blotches: 2,
  },
  // shiro
  {
    base: 'rgb(246,244,238)',
    patch: 'rgb(56,58,60)',
    fin: 'rgb(220,218,212)',
    edge: 'rgb(146,148,144)',
    blotches: 2,
  },
];

type Sprite = { w: number; h: number; cells: Uint8Array };
type Pad = { x: number; y: number; r: number; flower: boolean };

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

/** Side-view koi bitmap, nose at x=0, pointing toward +x. */
function buildSprite(len: number, variety: Variety): Sprite {
  const maxBH = Math.max(1.6, len * 0.17);
  const w = len;
  const h = Math.ceil(maxBH * 4) + 2;
  const cells = new Uint8Array(w * h);
  const cy = (h - 1) / 2;

  const bodyHalf = (v: number) =>
    maxBH * Math.max(0.2, Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * v)), 0.55));

  const mark = (x: number, y0: number, y1: number, kind: number, onlyEmpty = false) => {
    for (let y = Math.max(0, Math.ceil(y0)); y <= Math.min(h - 1, Math.floor(y1)); y++) {
      if (!onlyEmpty || cells[y * w + x] === EMPTY) cells[y * w + x] = kind;
    }
  };

  for (let x = 0; x < w; x++) {
    const u = x / (w - 1);
    if (u <= 0.76) {
      const v = u / 0.76;
      const bh = bodyHalf(v);
      mark(x, cy - bh, cy + bh, BODY);
      if (v > 0.32 && v < 0.68) {
        const fv = Math.sin((Math.PI * (v - 0.32)) / 0.36);
        mark(x, cy - bh - maxBH * 0.75 * fv, cy - bh, FIN, true);
      }
      if (v > 0.22 && v < 0.4) {
        const fv = Math.sin((Math.PI * (v - 0.22)) / 0.18);
        mark(x, cy + bh * 0.4, cy + bh + maxBH * 0.7 * fv, FIN, true);
      }
    } else {
      const v = (u - 0.76) / 0.24;
      const spread = maxBH * (0.25 + 1.5 * v);
      const notch = maxBH * 0.95 * v * v;
      for (let y = 0; y < h; y++) {
        const d = Math.abs(y - cy);
        if (d <= spread && !(v > 0.35 && d < notch)) cells[y * w + x] = FIN;
      }
    }
  }

  for (let i = 0; i < variety.blotches; i++) {
    const bx = (0.1 + Math.random() * 0.55) * w;
    const by = cy + (Math.random() - 0.5) * maxBH;
    const br = maxBH * (0.75 + Math.random() * 0.7);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (cells[y * w + x] !== BODY) continue;
        const dx = (x - bx) * 0.65;
        const dy = y - by;
        if (dx * dx + dy * dy <= br * br) cells[y * w + x] = PATCH;
      }
    }
  }

  // Outline, so each fish keeps a silhouette against busy water. Read from a
  // snapshot so freshly marked edges don't cascade inward.
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

  const ex = Math.round(w * 0.12);
  const ey = Math.round(cy - bodyHalf(ex / (w - 1) / 0.76) * 0.3);
  if (ey >= 0 && ey < h && cells[ey * w + ex] !== EMPTY) cells[ey * w + ex] = EYE;

  return { w, h, cells };
}

function makeKoi(cols: number, rows: number, seeded: boolean): Koi {
  const variety = VARIETIES[(Math.random() * VARIETIES.length) | 0];
  const len = Math.round(18 + Math.random() * 10);
  const angle = Math.random() * Math.PI * 2;
  const cruise = 7 + Math.random() * 6;
  return {
    x: seeded ? Math.random() * cols : cols / 2 - Math.cos(angle) * (cols / 2 + len),
    y: seeded ? Math.random() * rows : rows / 2 - Math.sin(angle) * (rows / 2 + len),
    angle,
    speed: cruise,
    cruise,
    dart: 0,
    turnRate: 0.7 + Math.random() * 0.5,
    swim: Math.random() * Math.PI * 2,
    amp: 0.5 + Math.random() * 0.6,
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

    const water = document.createElement('canvas');
    const wctx = water.getContext('2d', { alpha: true });
    if (!wctx) return;

    const calm = matchMedia('(prefers-reduced-motion: reduce)');
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let vw = 0;
    let vh = 0;
    let koi: Koi[] = [];
    let pads: Pad[] = [];
    let moonX = 0;
    let moonY = 0;
    let moonR = 0;
    let raf = 0;
    let last = 0;
    let t = 0;
    let frame = 0;

    // Reused every frame so the render path allocates nothing.
    const shadeBuckets: number[][] = RAMP.map(() => []);
    const koiBuckets = new Map<string, number[]>();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      vw = window.innerWidth;
      vh = window.innerHeight;
      for (const c of [canvas, water]) {
        c.width = Math.round(vw * dpr);
        c.height = Math.round(vh * dpr);
      }
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      for (const c of [ctx, wctx]) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.font = FONT;
        c.textBaseline = 'top';
      }
      cols = Math.ceil(vw / CELL) + 1;
      rows = Math.ceil(vh / CELL) + 1;

      const want = Math.max(6, Math.min(14, Math.round((cols * rows) / 2600)));
      koi = Array.from({ length: want }, () => makeKoi(cols, rows, true));

      const padCount = Math.max(4, Math.min(11, Math.round((cols * rows) / 3400)));
      pads = Array.from({ length: padCount }, () => ({
        x: Math.random() * cols,
        y: Math.random() * rows,
        r: 3.5 + Math.random() * 4,
        flower: Math.random() < 0.45,
      }));

      moonR = Math.min(cols, rows) * 0.17;
      moonX = cols * (0.62 + Math.random() * 0.16);
      moonY = rows * (0.34 + Math.random() * 0.2);
    };

    const drawWater = (band: number) => {
      const bandRows = Math.ceil(rows / WATER_BANDS);
      const ry0 = band * bandRows;
      const ry1 = Math.min(rows - 1, ry0 + bandRows - 1);
      if (ry0 > ry1) return;
      wctx.clearRect(0, ry0 * CELL, vw, (ry1 - ry0 + 1) * CELL);
      wctx.fillStyle = BASE;
      wctx.fillRect(0, ry0 * CELL, vw, (ry1 - ry0 + 1) * CELL);
      for (const b of shadeBuckets) b.length = 0;

      const cx = cols / 2;
      const cy = rows / 2;
      const norm = 1 / Math.hypot(cx, cy);

      for (let y = ry0; y <= ry1; y++) {
        for (let x = 0; x < cols; x++) {
          // Low frequency across x, high across y: each row stays coherent so
          // the surface breaks into horizontal streaks rather than noise.
          const n =
            Math.sin(x * 0.055 + y * 0.42 + t * 0.5) * 0.5 +
            Math.sin(x * 0.12 - y * 0.27 + t * 0.32) * 0.3 +
            Math.sin(x * 0.02 + y * 0.63 - t * 0.21) * 0.2;

          // Darker toward the middle, so the pond reads as deep water with a
          // lit rim rather than a flat field.
          const r = Math.hypot(x - cx, y - cy) * norm;
          let shade = 0.23 + (n * 0.5 + 0.5) * (0.5 + 0.44 * r);

          // Moon reflection, broken into bands by the surface.
          const md = Math.hypot((x - moonX) * 1.12, y - moonY);
          if (md < moonR) {
            const fall = 1 - md / moonR;
            shade += fall * fall * (0.6 + 0.4 * Math.sin(y * 0.85)) * 1.25;
          }

          const idx = Math.max(0, Math.min(RAMP.length - 1, (shade * RAMP.length) | 0));
          shadeBuckets[idx].push(x, y);
        }
      }

      for (let i = RAMP_MIN_DRAW; i < shadeBuckets.length; i++) {
        const b = shadeBuckets[i];
        if (!b.length) continue;
        wctx.fillStyle = RAMP_CSS[i];
        const g = RAMP_GLYPHS[i];
        for (let j = 0; j < b.length; j += 2) {
          wctx.fillText(g, b[j] * CELL, b[j + 1] * CELL);
        }
      }

      // Lily pads sit on the surface, so they draw over the water field.
      for (const p of pads) {
        const x0 = Math.max(0, Math.floor(p.x - p.r));
        const x1 = Math.min(cols - 1, Math.ceil(p.x + p.r));
        const y0 = Math.max(ry0, Math.floor(p.y - p.r * 0.72));
        const y1 = Math.min(ry1, Math.ceil(p.y + p.r * 0.72));
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const dx = x - p.x;
            const dy = (y - p.y) / 0.72;
            const d = Math.hypot(dx, dy);
            if (d > p.r) continue;
            // Notch cut out of one side, the way a lily pad is split.
            if (dx > 0 && Math.abs(dy) < p.r * 0.22 && d > p.r * 0.3) continue;
            const hash = ((x * 73856093) ^ (y * 19349663)) & 1023;
            wctx.fillStyle = PAD_GREEN[hash % PAD_GREEN.length];
            wctx.fillText(PAD_GLYPHS[hash % PAD_GLYPHS.length], x * CELL, y * CELL);
          }
        }
        if (p.flower && Math.round(p.y) >= ry0 && Math.round(p.y) <= ry1) {
          wctx.fillStyle = BLOSSOM;
          wctx.fillText('*', Math.round(p.x) * CELL, Math.round(p.y) * CELL);
        }
      }
    };

    const pushKoi = (color: string, gx: number, gy: number, glyph: number) => {
      let b = koiBuckets.get(color);
      if (!b) koiBuckets.set(color, (b = []));
      b.push(gx, gy, glyph);
    };

    const drawKoi = () => {
      koiBuckets.forEach(b => (b.length = 0));

      for (const k of koi) {
        const { w: sw, h: sh, cells } = k.sprite;
        const scx = (sw - 1) / 2;
        const scy = (sh - 1) / 2;
        const cos = Math.cos(k.angle);
        const sin = Math.sin(k.angle);
        // A side-view fish must never swim upside down, so mirror it across its
        // long axis once the heading passes vertical.
        const flip = cos < 0;
        const reach = Math.ceil(Math.hypot(sw, sh) / 2) + 2;

        const gx0 = Math.max(0, Math.floor(k.x - reach));
        const gx1 = Math.min(cols - 1, Math.ceil(k.x + reach));
        const gy0 = Math.max(0, Math.floor(k.y - reach));
        const gy1 = Math.min(rows - 1, Math.ceil(k.y + reach));

        for (let gy = gy0; gy <= gy1; gy++) {
          for (let gx = gx0; gx <= gx1; gx++) {
            const dx = gx - k.x;
            const dy = gy - k.y;
            const lx = dx * cos + dy * sin;
            let ly = -dx * sin + dy * cos;
            if (flip) ly = -ly;
            // Undulation: bend the body across its axis by a travelling wave
            // that grows toward the tail, so the fish flexes as it swims.
            const along = (lx + scx) / sw;
            const wave = Math.sin(along * 6 - k.swim) * k.amp * along * along;
            const sx = Math.round(lx + scx);
            const sy = Math.round(ly - wave + scy);
            if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
            const kind = cells[sy * sw + sx];
            if (kind === EMPTY) continue;
            const hash = ((gx * 73856093) ^ (gy * 19349663)) & 1023;
            if (kind === EYE) pushKoi('rgb(24,18,16)', gx, gy, -1);
            else if (kind === FIN) pushKoi(k.variety.fin, gx, gy, -2 - (hash % FIN_GLYPHS.length));
            else if (kind === EDGE) pushKoi(k.variety.edge, gx, gy, hash % KOI_GLYPHS.length);
            else if (kind === PATCH) pushKoi(k.variety.patch, gx, gy, hash % KOI_GLYPHS.length);
            else pushKoi(k.variety.base, gx, gy, hash % KOI_GLYPHS.length);
          }
        }
      }

      koiBuckets.forEach((b, color) => {
        if (!b.length) return;
        ctx.fillStyle = color;
        for (let i = 0; i < b.length; i += 3) {
          const code = b[i + 2];
          const g = code === -1 ? '@' : code <= -2 ? FIN_GLYPHS[-code - 2] : KOI_GLYPHS[code];
          ctx.fillText(g, b[i] * CELL, b[i + 1] * CELL);
        }
      });
    };

    const render = () => {
      drawWater(frame % WATER_BANDS);
      ctx.clearRect(0, 0, vw, vh);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(water, 0, 0);
      ctx.restore();
      drawKoi();
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = now - last;
      if (dt < 1000 / FPS_CAP) return;
      last = now;
      const sec = Math.min(dt, 100) / 1000;
      t += sec;
      frame++;

      const NEIGH2 = 40 * 40;
      const SEP2 = 13 * 13;

      for (let i = 0; i < koi.length; i++) {
        const k = koi[i];

        // Boids: alignment and cohesion give the school a shared intent,
        // separation stops them stacking up.
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
          wx += (cohX / cl) * 0.4 + (aliX / n) * 0.7 + sepX * 1.1;
          wy += (cohY / cl) * 0.4 + (aliY / n) * 0.7 + sepY * 1.1;
        }

        const margin = 14;
        if (k.x < margin) wx += 1.6;
        if (k.x > cols - margin) wx -= 1.6;
        if (k.y < margin) wy += 1.6;
        if (k.y > rows - margin) wy -= 1.6;

        k.dart -= sec;
        if (k.dart < -4 && Math.random() < 0.012) k.dart = 0.5 + Math.random() * 0.8;

        const target = Math.atan2(wy, wx);
        let diff = target - k.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const maxTurn = k.turnRate * sec;
        k.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

        const turning = Math.min(1, Math.abs(diff));
        k.speed = k.cruise * (k.dart > 0 ? 1.9 : 1) * (1 - turning * 0.3);
        k.swim += (4 + k.speed * 0.3) * sec;
        k.x += Math.cos(k.angle) * k.speed * sec;
        k.y += Math.sin(k.angle) * k.speed * sec;

        const pad = k.sprite.w * 2;
        if (k.x < -pad || k.x > cols + pad || k.y < -pad || k.y > rows + pad) {
          koi[i] = makeKoi(cols, rows, false);
        }
      }
      render();
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
      render();
    };
    const onCalmChange = () => {
      stop();
      resize();
      render();
      start();
    };

    resize();
    render();
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

import { useEffect, useRef } from 'react';

/*
 * ASCII koi pond rendered to a single canvas behind the page.
 *
 * Deliberately cheap: one canvas, no DOM churn, no backdrop-filter interaction.
 * The water grid is scanned with plain arithmetic each frame and only the cells
 * that cross a threshold ever reach fillText, so a 1440x900 viewport paints a
 * few hundred glyphs rather than the ~6,000 cells it walks. Capped at 30fps,
 * paused when the tab is hidden, and reduced to one static frame when the
 * visitor asks for less motion.
 */

const CELL_W = 11;
const CELL_H = 18;
const FPS_CAP = 30;

const WATER_GLYPHS = ['~', '~', '-', '≈', '·'];

type Koi = {
  x: number;
  y: number;
  speed: number;
  dir: 1 | -1;
  bob: number;
  bobSpeed: number;
  sprite: string;
  color: string;
};

const KOI_COLORS = [
  'rgba(226, 98, 48, 0.85)', // classic orange
  'rgba(226, 98, 48, 0.85)',
  'rgba(216, 160, 60, 0.8)', // gold
  'rgba(120, 96, 92, 0.55)', // smoke
  'rgba(236, 232, 222, 0.9)', // cream
];

function makeKoi(cols: number, rows: number, seeded: boolean): Koi {
  const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  const big = Math.random() < 0.55;
  const sprite = big ? (dir === 1 ? '><(((°>' : '<°)))><') : dir === 1 ? '><>' : '<><';
  return {
    // `seeded` spreads the first generation across the pond so it doesn't start
    // with every fish queued off the left edge.
    x: seeded ? Math.random() * cols : dir === 1 ? -sprite.length : cols + sprite.length,
    y: 2 + Math.random() * Math.max(1, rows - 4),
    speed: (0.8 + Math.random() * 1.5) * (big ? 0.8 : 1.15),
    dir,
    bob: Math.random() * Math.PI * 2,
    bobSpeed: 0.3 + Math.random() * 0.5,
    sprite,
    color: KOI_COLORS[(Math.random() * KOI_COLORS.length) | 0],
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

    const resize = () => {
      // Cap the device pixel ratio: past 2x the extra glyph fidelity is
      // invisible but the fill cost keeps climbing.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textBaseline = 'top';
      cols = Math.ceil(w / CELL_W) + 2;
      rows = Math.ceil(h / CELL_H) + 2;
      const want = Math.max(4, Math.min(10, Math.round((cols * rows) / 900)));
      koi = Array.from({ length: want }, () => makeKoi(cols, rows, true));
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // --- water ---
      ctx.fillStyle = 'rgba(70, 140, 165, 0.2)';
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Three offset waves plus a per-cell phase jitter. Pure sines alone
          // line up into obvious diagonal banding; the hash scatters their
          // phase so the surface reads as water rather than wallpaper, and it
          // is still only integer ops per cell.
          const hash = ((x * 73856093) ^ (y * 19349663)) & 1023;
          const jitter = hash * 0.00614;
          const v =
            Math.sin(x * 0.32 + y * 0.21 + t * 0.55 + jitter) +
            Math.sin(x * 0.11 - y * 0.37 + t * 0.31) +
            Math.sin((x + y) * 0.07 + t * 0.17);
          if (v > 1.78) {
            const g = WATER_GLYPHS[hash % WATER_GLYPHS.length];
            ctx.fillText(g, x * CELL_W, y * CELL_H);
          }
        }
      }

      // --- koi ---
      for (const k of koi) {
        const y = k.y + Math.sin(k.bob) * 0.6;
        ctx.fillStyle = k.color;
        ctx.fillText(k.sprite, k.x * CELL_W, y * CELL_H);
      }
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
        k.x += k.speed * k.dir * sec * 3;
        k.bob += k.bobSpeed * sec;
        const gone = k.dir === 1 ? k.x > cols + k.sprite.length : k.x < -k.sprite.length;
        if (gone) koi[i] = makeKoi(cols, rows, false);
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

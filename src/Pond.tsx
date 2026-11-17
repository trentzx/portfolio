import { useEffect, useRef } from 'react';

/*
 * Nagomi-style koi pond, rendered top-down with smooth vector shapes.
 *
 * Layers, back to front: a jade water gradient, slow caustic bands, lily pads
 * with veins and lotus blossoms, schools of fry, then the koi. Everything that
 * barely moves (water, caustics, pads) renders to an offscreen canvas a few
 * frames apart and is blitted in between; only the fish are redrawn every
 * frame. Without that split the caustic strokes alone cost more than a whole
 * frame's budget.
 *
 * Each koi is a single filled path built from a flexing spine, so the body
 * genuinely bends as it swims rather than sliding as a rigid shape. Markings
 * are drawn in the same local space and clipped to that path, which is what
 * keeps them sitting on the fish as it turns.
 */

const FPS_CAP = 30;
const SLOW_EVERY = 3; // frames between water/caustic/pad redraws
/*
 * Everything renders into a buffer this many times smaller than the viewport
 * and is scaled back up with nearest-neighbour, which is what gives the scene
 * its chunky pixel edges. It also means roughly a sixteenth of the fill cost,
 * so the whole pond gets cheaper as well as blockier.
 */
const PIXEL = 4;

type Variety = { body: string; belly: string; marks: string[]; markCount: number };

const VARIETIES: Variety[] = [
  // kohaku: white with red
  { body: '#f6f2e9', belly: '#dcd6c8', marks: ['#d8402a', '#c3331f'], markCount: 4 },
  // showa: white with red and black
  { body: '#f4f0e7', belly: '#d8d2c4', marks: ['#cf3a26', '#20201e'], markCount: 5 },
  // ogon: solid orange
  { body: '#e8913a', belly: '#cf7a2a', marks: ['#d07d26'], markCount: 2 },
  // bekko: white with charcoal
  { body: '#f6f3ec', belly: '#dbd6c9', marks: ['#26262a', '#36343a'], markCount: 3 },
];

type Mark = { u: number; v: number; rx: number; ry: number; color: string };

type Koi = {
  x: number;
  y: number;
  angle: number;
  len: number;
  speed: number;
  cruise: number;
  dart: number;
  turnRate: number;
  swim: number;
  amp: number;
  variety: Variety;
  marks: Mark[];
  grad: CanvasGradient | null;
};

type Pad = { x: number; y: number; r: number; rot: number; flower: boolean };
type School = { x: number; y: number; angle: number; n: number; color: string; spread: number };

function makeKoi(w: number, h: number, seeded: boolean): Koi {
  const variety = VARIETIES[(Math.random() * VARIETIES.length) | 0];
  const len = 76 + Math.random() * 58;
  const angle = Math.random() * Math.PI * 2;
  const cruise = 16 + Math.random() * 16;
  const marks: Mark[] = [];
  for (let i = 0; i < variety.markCount; i++) {
    marks.push({
      u: 0.1 + Math.random() * 0.62,
      v: (Math.random() - 0.5) * 0.7,
      rx: 0.07 + Math.random() * 0.12,
      ry: 0.1 + Math.random() * 0.18,
      color: variety.marks[(Math.random() * variety.marks.length) | 0],
    });
  }
  return {
    x: seeded ? Math.random() * w : w / 2 - Math.cos(angle) * (w / 2 + len * 2),
    y: seeded ? Math.random() * h : h / 2 - Math.sin(angle) * (h / 2 + len * 2),
    angle,
    len,
    speed: cruise,
    cruise,
    dart: 0,
    turnRate: 0.55 + Math.random() * 0.45,
    swim: Math.random() * Math.PI * 2,
    amp: 0.1 + Math.random() * 0.07,
    variety,
    marks,
    grad: null,
  };
}

/** Lateral offset of the spine at u, the travelling wave that bends the fish. */
function bendAt(k: Koi, u: number) {
  return Math.sin(u * 4.6 - k.swim) * k.amp * u * u * k.len;
}

/**
 * Traces a koi outline into the current path, in local space: nose at origin,
 * tail toward +x.
 */
function koiPath(ctx: CanvasRenderingContext2D, k: Koi, scale = 1) {
  const L = k.len * scale;
  const SEG = 14;
  const spine: { x: number; y: number; hw: number }[] = [];
  for (let i = 0; i <= SEG; i++) {
    const u = i / SEG;
    // Rounded head, widest around a third, tapering to the peduncle.
    const hw = Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * u)), 0.62) * L * 0.17;
    spine.push({ x: u * L, y: bendAt(k, u) * scale, hw: Math.max(hw, L * 0.012) });
  }

  const sideways = (i: number, sign: number) => {
    const p = spine[i];
    const prev = spine[Math.max(0, i - 1)];
    const nx = p.y - prev.y;
    const ny = -(p.x - prev.x);
    const nl = Math.hypot(nx, ny) || 1;
    return [p.x + (nx / nl) * p.hw * sign, p.y + (ny / nl) * p.hw * sign] as const;
  };

  ctx.beginPath();
  for (let i = 0; i < spine.length; i++) {
    const [px, py] = sideways(i, 1);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  // Tail fan.
  const tip = spine[spine.length - 1];
  ctx.lineTo(tip.x + L * 0.22, tip.y - L * 0.15);
  ctx.lineTo(tip.x + L * 0.12, tip.y);
  ctx.lineTo(tip.x + L * 0.22, tip.y + L * 0.15);
  for (let i = spine.length - 1; i >= 0; i--) {
    const [px, py] = sideways(i, -1);
    ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export default function Pond() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const back = document.createElement('canvas');
    const bctx = back.getContext('2d', { alpha: false });
    if (!bctx) return;

    const calm = matchMedia('(prefers-reduced-motion: reduce)');
    let w = 0;
    let h = 0;
    let koi: Koi[] = [];
    let pads: Pad[] = [];
    let schools: School[] = [];
    let raf = 0;
    let last = 0;
    let t = 0;
    let frame = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      // Low-resolution backing store, stretched to full size by CSS. Device
      // pixel ratio is deliberately ignored: chunky pixels are the point.
      for (const c of [canvas, back]) {
        c.width = Math.ceil(w / PIXEL);
        c.height = Math.ceil(h / PIXEL);
      }
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      // Draw in CSS-pixel coordinates; the transform maps them into the buffer.
      ctx.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0);
      bctx.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0);
      ctx.imageSmoothingEnabled = false;
      bctx.imageSmoothingEnabled = false;

      koi = Array.from({ length: Math.max(6, Math.min(13, Math.round((w * h) / 140000))) }, () =>
        makeKoi(w, h, true),
      );

      // Pads cluster toward the edges, keeping the middle of the pond open.
      const padCount = Math.max(6, Math.min(16, Math.round((w * h) / 95000)));
      pads = Array.from({ length: padCount }, () => {
        const left = Math.random() < 0.5;
        const inset = Math.random() * w * 0.3;
        return {
          x: (left ? inset : w - inset) + (Math.random() - 0.5) * 80,
          y: Math.random() * h,
          r: 58 + Math.random() * 62,
          rot: Math.random() * Math.PI * 2,
          flower: Math.random() < 0.4,
        };
      });

      schools = Array.from({ length: 3 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        angle: Math.random() * Math.PI * 2,
        n: 14 + ((Math.random() * 16) | 0),
        color: Math.random() < 0.5 ? 'rgba(248,214,96,0.85)' : 'rgba(240,150,170,0.8)',
        spread: 26 + Math.random() * 22,
      }));
    };

    const drawPad = (c: CanvasRenderingContext2D, p: Pad) => {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      // Soft shade under the pad, so it floats on the water rather than in it.
      c.fillStyle = 'rgba(6,46,36,0.3)';
      c.beginPath();
      c.ellipse(5, 9, p.r, p.r * 0.92, 0, 0, Math.PI * 2);
      c.fill();

      const g = c.createRadialGradient(-p.r * 0.3, -p.r * 0.3, p.r * 0.15, 0, 0, p.r);
      g.addColorStop(0, '#2f6f4a');
      g.addColorStop(1, '#17412c');
      c.fillStyle = g;
      c.beginPath();
      // The wedge missing from one side is what reads as a lily pad.
      c.ellipse(0, 0, p.r, p.r * 0.92, 0, 0.28, Math.PI * 2 - 0.28);
      c.lineTo(0, 0);
      c.closePath();
      c.fill();

      c.strokeStyle = 'rgba(150,215,170,0.22)';
      c.lineWidth = 1.4;
      for (let i = 0; i < 9; i++) {
        const a = 0.34 + (i / 8) * (Math.PI * 2 - 0.68);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(Math.cos(a) * p.r * 0.93, Math.sin(a) * p.r * 0.86);
        c.stroke();
      }
      c.restore();

      if (p.flower) {
        c.save();
        c.translate(p.x - p.r * 0.1, p.y - p.r * 0.1);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          c.fillStyle = i % 2 ? '#f27fb4' : '#e85f93';
          c.beginPath();
          c.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 8, 4, a, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#ffe9a8';
        c.beginPath();
        c.arc(0, 0, 5, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    };

    const drawBack = () => {
      const g = bctx.createLinearGradient(0, 0, w * 0.4, h);
      g.addColorStop(0, '#2f8d72');
      g.addColorStop(0.5, '#27795f');
      g.addColorStop(1, '#1b5c48');
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, w, h);

      const glow = bctx.createRadialGradient(
        w * 0.42,
        h * 0.4,
        10,
        w * 0.42,
        h * 0.4,
        Math.max(w, h) * 0.6,
      );
      glow.addColorStop(0, 'rgba(142,226,192,0.3)');
      glow.addColorStop(1, 'rgba(142,226,192,0)');
      bctx.fillStyle = glow;
      bctx.fillRect(0, 0, w, h);

      // Caustics: slow bands of light bending across the surface.
      bctx.lineCap = 'round';
      const bands = Math.ceil(h / 46) + 2;
      for (let i = 0; i < bands; i++) {
        const base = i * 46;
        bctx.beginPath();
        for (let x = -40; x <= w + 40; x += 22) {
          const y =
            base +
            Math.sin(x * 0.0065 + t * 0.34 + i * 0.7) * 24 +
            Math.sin(x * 0.019 - t * 0.22 + i) * 9;
          if (x <= -40) bctx.moveTo(x, y);
          else bctx.lineTo(x, y);
        }
        bctx.strokeStyle = i % 2 ? 'rgba(186,255,222,0.055)' : 'rgba(212,255,236,0.085)';
        bctx.lineWidth = 7 + Math.sin(i * 1.3 + t * 0.2) * 4;
        bctx.stroke();
      }

      for (const p of pads) drawPad(bctx, p);
    };

    const drawKoi = (k: Koi) => {
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(k.angle);
      /*
       * The sprite is built with its nose at the origin and the body running
       * along +x, but +x is also the direction of travel, which left every
       * fish swimming tail-first. Mirroring local x puts the body behind the
       * nose instead; everything drawn in this space (fins, eye, markings)
       * follows automatically.
       */
      ctx.scale(-1, 1);

      // Shadow on the pond floor, offset so the fish reads as above it.
      ctx.save();
      ctx.translate(k.len * 0.1, k.len * 0.22);
      ctx.fillStyle = 'rgba(5,40,31,0.26)';
      koiPath(ctx, k, 1.03);
      ctx.fill();
      ctx.restore();

      koiPath(ctx, k);
      ctx.save();
      ctx.clip();

      if (!k.grad) {
        k.grad = ctx.createLinearGradient(0, -k.len * 0.2, 0, k.len * 0.2);
        k.grad.addColorStop(0, k.variety.body);
        k.grad.addColorStop(1, k.variety.belly);
      }
      ctx.fillStyle = k.grad;
      ctx.fillRect(-k.len * 0.3, -k.len * 0.5, k.len * 2, k.len);

      // Markings ride the same bend, so they stay on the fish as it flexes.
      for (const m of k.marks) {
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.ellipse(
          m.u * k.len,
          bendAt(k, m.u) + m.v * k.len * 0.17,
          m.rx * k.len,
          m.ry * k.len,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.restore();

      // Pectoral fins catching a little light.
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.ellipse(k.len * 0.3, -k.len * 0.2, k.len * 0.14, k.len * 0.07, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(k.len * 0.3, k.len * 0.2, k.len * 0.14, k.len * 0.07, 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(20,24,22,0.75)';
      ctx.beginPath();
      ctx.arc(k.len * 0.1, -k.len * 0.07, k.len * 0.022, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(k.len * 0.1, k.len * 0.07, k.len * 0.022, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawSchool = (s: School) => {
      ctx.fillStyle = s.color;
      for (let i = 0; i < s.n; i++) {
        const a = i * 2.4;
        const d = (i / s.n) * s.spread;
        const x = s.x + Math.cos(s.angle) * d + Math.cos(a + t * 2) * 5;
        const y = s.y + Math.sin(s.angle) * d + Math.sin(a + t * 2) * 5;
        ctx.beginPath();
        ctx.ellipse(x, y, 3.1, 1.5, s.angle, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const render = () => {
      if (frame % SLOW_EVERY === 0) drawBack();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(back, 0, 0);
      ctx.restore();
      for (const s of schools) drawSchool(s);
      for (const k of koi) drawKoi(k);
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = now - last;
      if (dt < 1000 / FPS_CAP) return;
      last = now;
      const sec = Math.min(dt, 100) / 1000;
      t += sec;
      frame++;

      const NEIGH2 = 190 * 190;
      const SEP2 = 62 * 62;

      for (let i = 0; i < koi.length; i++) {
        const k = koi[i];
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

        let wx = Math.cos(k.angle) * 1.3;
        let wy = Math.sin(k.angle) * 1.3;
        if (n) {
          const cl = Math.hypot(cohX, cohY) || 1;
          wx += (cohX / cl) * 0.35 + (aliX / n) * 0.7 + sepX * 1.15;
          wy += (cohY / cl) * 0.35 + (aliY / n) * 0.7 + sepY * 1.15;
        }

        const margin = 90;
        if (k.x < margin) wx += 1.7;
        if (k.x > w - margin) wx -= 1.7;
        if (k.y < margin) wy += 1.7;
        if (k.y > h - margin) wy -= 1.7;

        k.dart -= sec;
        if (k.dart < -5 && Math.random() < 0.01) k.dart = 0.6 + Math.random() * 0.9;

        let diff = Math.atan2(wy, wx) - k.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const maxTurn = k.turnRate * sec;
        k.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

        const turning = Math.min(1, Math.abs(diff));
        k.speed = k.cruise * (k.dart > 0 ? 1.8 : 1) * (1 - turning * 0.3);
        k.swim += (3.4 + k.speed * 0.05) * sec;
        k.x += Math.cos(k.angle) * k.speed * sec;
        k.y += Math.sin(k.angle) * k.speed * sec;

        const pad = k.len * 3;
        if (k.x < -pad || k.x > w + pad || k.y < -pad || k.y > h + pad) {
          koi[i] = makeKoi(w, h, false);
        }
      }

      for (const s of schools) {
        s.angle += Math.sin(t * 0.5 + s.spread) * 0.4 * sec;
        s.x += Math.cos(s.angle) * 22 * sec;
        s.y += Math.sin(s.angle) * 22 * sec;
        if (s.x < -80) s.x = w + 80;
        if (s.x > w + 80) s.x = -80;
        if (s.y < -80) s.y = h + 80;
        if (s.y > h + 80) s.y = -80;
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
      drawBack();
      render();
    };
    const onCalmChange = () => {
      stop();
      resize();
      drawBack();
      render();
      start();
    };

    resize();
    drawBack();
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

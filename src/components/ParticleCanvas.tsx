import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

export interface ParticleCanvasHandle {
  emitStreamDroplet: (fromX: number, fromY: number, toX: number, toY: number) => void;
  emitTapBurst: (x: number, y: number, kind: 'drop' | 'petal' | 'heart') => void;
  emitCelebration: (centerX: number, centerY: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  drag: number;
  rotation: number;
  vr: number;
  kind: 'droplet' | 'splash' | 'petal' | 'heart' | 'mote';
  color: string;
  targetY?: number;
}

const PETAL_COLORS = ['#fde047', '#facc15', '#fb923c', '#fda4af', '#86efac'];

export const ParticleCanvas = forwardRef<ParticleCanvasHandle>(function ParticleCanvas(
  _props,
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const spawnSplash = (x: number, y: number) => {
    for (let i = 0; i < 4; i += 1) {
      const angle = -Math.PI * (0.15 + Math.random() * 0.7);
      const speed = 1.4 + Math.random() * 2.4;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6,
        size: 1.8 + Math.random() * 2,
        alpha: 0.9,
        decay: 0.032,
        gravity: 0.16,
        drag: 0.98,
        rotation: 0,
        vr: 0,
        kind: 'splash',
        color: Math.random() > 0.4 ? '#38bdf8' : '#bae6fd',
      });
    }
  };

  useImperativeHandle(ref, () => ({
    emitStreamDroplet(fromX: number, fromY: number, toX: number, toY: number) {
      if (reducedMotionRef.current) return;
      const spreadX = (Math.random() - 0.5) * 18;
      const dx = toX + spreadX - fromX;
      const frames = 13 + Math.random() * 4;
      const gravity = 0.42;
      const vx = dx / frames;
      const vy = (toY - fromY - 0.5 * gravity * frames * frames) / frames;

      particlesRef.current.push({
        x: fromX + (Math.random() - 0.5) * 6,
        y: fromY + (Math.random() - 0.5) * 6,
        vx,
        vy,
        size: 3.4 + Math.random() * 2.2,
        alpha: 0.95,
        decay: 0.012,
        gravity,
        drag: 0.995,
        rotation: 0,
        vr: 0,
        kind: 'droplet',
        color: Math.random() > 0.35 ? '#0ea5e9' : '#38bdf8',
        targetY: toY + (Math.random() - 0.5) * 16,
      });
    },

    emitTapBurst(x: number, y: number, kind: 'drop' | 'petal' | 'heart') {
      if (reducedMotionRef.current) return;
      const count = 8;
      for (let i = 0; i < count; i += 1) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const speed = 2.0 + Math.random() * 3.0;
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 24,
          y: y + (Math.random() - 0.5) * 16,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          size: kind === 'drop' ? 3 + Math.random() * 2 : 5 + Math.random() * 3,
          alpha: 0.96,
          decay: 0.02,
          gravity: kind === 'petal' ? 0.06 : 0.14,
          drag: 0.97,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.14,
          kind: kind === 'drop' ? 'splash' : kind,
          color:
            kind === 'drop'
              ? '#38bdf8'
              : kind === 'heart'
                ? '#fb7185'
                : PETAL_COLORS[i % PETAL_COLORS.length],
        });
      }
    },

    emitCelebration(centerX: number, centerY: number) {
      if (reducedMotionRef.current) return;
      for (let i = 0; i < 28; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.2 + Math.random() * 4.5;
        const isPetal = i % 3 !== 0;
        particlesRef.current.push({
          x: centerX + (Math.random() - 0.5) * 26,
          y: centerY + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.4,
          size: isPetal ? 5.5 + Math.random() * 3.5 : 3.2 + Math.random() * 2,
          alpha: 1,
          decay: 0.013 + Math.random() * 0.008,
          gravity: isPetal ? 0.075 : 0.13,
          drag: 0.975,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.18,
          kind: isPetal ? 'petal' : 'splash',
          color: isPetal
            ? PETAL_COLORS[i % PETAL_COLORS.length]
            : '#38bdf8',
        });
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Seed gentle ambient sunlit motes
    const motes: Particle[] = Array.from({ length: 12 }, () => ({
      x: Math.random() * 420,
      y: Math.random() * 320,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -0.12 - Math.random() * 0.18,
      size: 1.4 + Math.random() * 1.8,
      alpha: 0.25 + Math.random() * 0.35,
      decay: 0,
      gravity: 0,
      drag: 1,
      rotation: 0,
      vr: 0,
      kind: 'mote',
      color: '#fef08a',
    }));

    const render = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = rect?.width ?? 400;
      const h = rect?.height ?? 320;
      ctx.clearRect(0, 0, w, h);

      if (!reducedMotionRef.current) {
        // Draw ambient sun motes
        for (const m of motes) {
          m.x += m.vx;
          m.y += m.vy;
          if (m.y < -10) m.y = h + 10;
          if (m.x < -10) m.x = w + 10;
          if (m.x > w + 10) m.x = -10;

          ctx.save();
          ctx.globalAlpha = m.alpha;
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      const active: Particle[] = [];
      for (const p of particlesRef.current) {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        p.alpha -= p.decay;

        if (p.kind === 'droplet' && p.targetY !== undefined && p.y >= p.targetY) {
          spawnSplash(p.x, p.targetY);
          continue;
        }

        if (p.alpha <= 0.02 || p.y > h + 24) {
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.kind === 'droplet') {
          const angle = Math.atan2(p.vy, p.vx) - Math.PI / 2;
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.4);
          ctx.quadraticCurveTo(p.size, 0, 0, p.size * 1.1);
          ctx.quadraticCurveTo(-p.size, 0, 0, -p.size * 1.4);
          ctx.fill();
        } else if (p.kind === 'petal') {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.56, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'heart') {
          const s = p.size * 0.65;
          ctx.beginPath();
          ctx.moveTo(0, s);
          ctx.bezierCurveTo(-s * 1.4, -s * 0.2, -s * 0.7, -s * 1.4, 0, -s * 0.5);
          ctx.bezierCurveTo(s * 0.7, -s * 1.4, s * 1.4, -s * 0.2, 0, s);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        active.push(p);
      }

      particlesRef.current = active;
      rafRef.current = window.requestAnimationFrame(render);
    };

    rafRef.current = window.requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 w-full h-full"
    />
  );
});

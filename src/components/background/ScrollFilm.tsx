import { useEffect, useRef, useState } from 'react';
import frames from '@/data/frames.json';
import { useMotionPref } from '@/hooks/useMotionPref';

type SetName = keyof typeof frames;

const pickSet = (): SetName => (window.innerWidth / window.innerHeight < 1 ? 'portrait' : 'landscape');
const frameUrl = (set: SetName, i: number) => `/media/frames/${set}/${String(i).padStart(3, '0')}.webp`;

/** Coarse-to-fine order (0, 48, 24, 72, 12, …) so the whole film is scrubbable early and sharpens as it loads. */
function loadOrder(count: number, minStep: number) {
  const order: number[] = [];
  const seen = new Set<number>();
  for (let step = 2 ** Math.floor(Math.log2(count)); step >= minStep; step /= 2) {
    for (let i = 0; i < count; i += step) if (!seen.has(i)) seen.add(i), order.push(i);
  }
  if (!seen.has(count - 1)) order.push(count - 1);
  return order;
}

/**
 * Fixed background film scrubbed by page scroll. The video is pre-rendered into WebP frames
 * (see scripts/prepare-assets.mjs) because seeking a <video> per scroll tick stutters on mobile.
 * Scroll is never hijacked: we only ease the displayed frame towards the scroll position.
 */
export function ScrollFilm() {
  const { reduced } = useMotionPref();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [set, setSet] = useState<SetName>(pickSet);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onResize = () => setSet(pickSet());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    const { count, width, height } = frames[set];
    canvas.width = width;
    canvas.height = height;
    const images: (HTMLImageElement | null)[] = new Array(count).fill(null);
    let disposed = false;

    // Data saver / slow networks: a quarter of the frames still give a continuous scrub.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const lite = !!conn?.saveData || /2g/.test(conn?.effectiveType ?? '');
    const queue = loadOrder(count, lite ? 4 : 1);

    let drawn = -1;
    let current = 0;
    let target = 0;
    let raf = 0;

    const nearestLoaded = (i: number) => {
      for (let d = 0; d < count; d++) {
        if (images[i - d]) return i - d;
        if (images[i + d]) return i + d;
      }
      return -1;
    };

    const draw = (force = false) => {
      const idx = nearestLoaded(Math.round(current * (count - 1)));
      if (idx < 0 || (idx === drawn && !force)) return;
      ctx.drawImage(images[idx]!, 0, 0, width, height);
      drawn = idx;
    };

    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    const tick = () => {
      current += (target - current) * 0.14;
      if (Math.abs(target - current) < 0.0004) current = target;
      draw();
      raf = current === target ? 0 : requestAnimationFrame(tick);
    };

    const onScroll = () => {
      measure();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    measure();
    current = target;

    let cursor = 0;
    const worker = async () => {
      while (!disposed && cursor < queue.length) {
        const i = queue[cursor++];
        const img = new Image();
        img.decoding = 'async';
        img.src = frameUrl(set, i);
        try {
          await img.decode();
        } catch {
          continue;
        }
        if (disposed) return;
        images[i] = img;
        // Redraw when a closer frame to the current position arrives.
        if (Math.abs(i - Math.round(current * (count - 1))) < Math.abs(drawn - Math.round(current * (count - 1))) || drawn < 0) {
          draw(true);
          setReady(true);
        }
      }
    };
    Array.from({ length: 4 }, worker);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [set, reduced]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[100lvh] overflow-hidden bg-ink">
      <img
        src={`/media/poster-${set}.webp`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
        decoding="async"
      />
      {!reduced && (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {/* Light shaping: keeps text readable without killing the film. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_35%,transparent_30%,rgb(var(--ink)/0.75)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/70 to-transparent" />
    </div>
  );
}

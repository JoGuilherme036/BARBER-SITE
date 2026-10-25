import { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import frames from '@/data/frames.json';
import { useMotionPref } from '@/hooks/useMotionPref';
import { asset } from '@/lib/asset';

type SetName = keyof typeof frames;

const pickSet = (): SetName => (window.innerWidth / window.innerHeight < 1 ? 'portrait' : 'landscape');
const frameUrl = (set: SetName, i: number) => asset(`media/frames/${set}/${String(i).padStart(3, '0')}.webp`);

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
 * Film scrubbed by a 0–1 progress value (the intro section's scroll). The video is pre-rendered
 * into WebP frames (scripts/prepare-assets.mjs) because seeking a <video> per scroll tick stutters
 * on mobile. Scroll is never hijacked: the displayed frame only eases towards the scroll position.
 */
export function ScrollFilm({ progress }: { progress: MotionValue<number> }) {
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
    let target = progress.get();
    let current = target;
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

    const tick = () => {
      current += (target - current) * 0.16;
      if (Math.abs(target - current) < 0.0004) current = target;
      draw();
      raf = current === target ? 0 : requestAnimationFrame(tick);
    };

    const unsubscribe = progress.on('change', (v) => {
      target = Math.min(1, Math.max(0, v));
      if (!raf) raf = requestAnimationFrame(tick);
    });

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
        const want = Math.round(current * (count - 1));
        if (drawn < 0 || Math.abs(i - want) < Math.abs(drawn - want)) {
          draw(true);
          setReady(true);
        }
      }
    };
    Array.from({ length: 4 }, worker);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      unsubscribe();
    };
  }, [set, reduced, progress]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-ink">
      <img src={asset(`media/poster-${set}.webp`)} alt="" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" decoding="async" />
      {!reduced && (
        <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </div>
  );
}

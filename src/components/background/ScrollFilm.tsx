import { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import film from '@/data/film.json';
import { useMotionPref } from '@/hooks/useMotionPref';
import { asset } from '@/lib/asset';

type SetName = keyof typeof film;

const pickSet = (): SetName => (window.innerWidth / window.innerHeight < 1 ? 'portrait' : 'landscape');

function sourceFor(set: SetName) {
  const probe = document.createElement('video');
  return probe.canPlayType('video/mp4; codecs="avc1.4D401E"') ? asset(`media/film/${set}.mp4`) : asset(`media/film/${set}.webm`);
}

/**
 * Film scrubbed by a 0–1 progress value (the intro section's scroll).
 * The video is encoded with a keyframe on every frame, so any seek is instant and the browser
 * holds a single decoded frame (an image sequence would keep ~350 MB of frames on a phone).
 * Scroll is never hijacked: the video time only eases towards the scroll position, and a new
 * seek is issued only after the previous one finished, so seeks never pile up.
 */
export function ScrollFilm({ progress }: { progress: MotionValue<number> }) {
  const { reduced } = useMotionPref();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [set, setSet] = useState<SetName>(pickSet);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onResize = () => setSet(pickSet());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (reduced || !video) return;
    // Data saver / very slow networks: keep the still poster.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /(^|-)2g/.test(conn?.effectiveType ?? '')) return;

    const src = sourceFor(set);
    const { duration } = film[set];
    const end = duration - 0.04;
    let disposed = false;
    let objectUrl = '';
    let target = progress.get() * end;
    let current = target;
    let raf = 0;
    let seeking = false;
    let loaded = false;
    setReady(false);
    video.muted = true;

    const seek = () => {
      if (!loaded || seeking) return;
      if (Math.abs(video.currentTime - current) < 1 / 60) return;
      seeking = true;
      video.currentTime = current;
    };

    const tick = () => {
      current += (target - current) * 0.2;
      if (Math.abs(target - current) < 0.005) current = target;
      seek();
      raf = current === target ? 0 : requestAnimationFrame(tick);
    };

    const onSeeked = () => {
      seeking = false;
      if (!disposed) setReady(true);
      seek(); // catch up if the target moved while seeking
    };

    const onLoaded = async () => {
      // iOS paints nothing until a muted video has played once.
      try {
        await video.play();
      } catch {
        /* autoplay refused: seeking still works */
      }
      video.pause();
      loaded = true;
      current = target;
      seeking = true;
      video.currentTime = current;
    };

    // Seeking is only smooth once the whole file is local, so load it as a blob first.
    let triedDirect = false;
    const onError = () => {
      if (disposed || triedDirect) return;
      triedDirect = true;
      video.src = src;
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadeddata', onLoaded, { once: true });
    video.addEventListener('error', onError);

    fetch(src)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;
      })
      .catch(onError);

    const unsubscribe = progress.on('change', (v) => {
      target = Math.min(1, Math.max(0, v)) * end;
      if (!raf) raf = requestAnimationFrame(tick);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      unsubscribe();
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
      video.removeAttribute('src');
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [set, reduced, progress]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-ink">
      <img src={asset(`media/poster-${set}.webp`)} alt="" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" decoding="async" />
      {!reduced && (
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          tabIndex={-1}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}

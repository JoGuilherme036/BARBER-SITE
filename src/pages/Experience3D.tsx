import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useMotionPref } from '@/hooks/useMotionPref';
import { track } from '@/lib/analytics';
import { Icon } from '@/components/ui/Icon';
import { SmartImage } from '@/components/ui/SmartImage';
import type { ChairViewer, FocusName } from '@/babylon/chairScene';

const focusOptions: { id: FocusName; label: string; text: string }[] = [
  { id: 'geral', label: 'Visão geral', text: 'Poltrona hidráulica giratória, inspirada nas cadeiras clássicas de barbearia.' },
  { id: 'couro', label: 'Couro', text: 'Estofado em couro com costura em canais e acabamento acetinado.' },
  { id: 'base', label: 'Base', text: 'Coluna hidráulica cromada com bomba de pé e anel em latão.' },
  { id: 'monograma', label: 'Monograma', text: 'Placa em latão com o monograma da casa nas costas do encosto.' },
];

/** Isolated Babylon.js route: the R3F scene on the home page is unmounted before this loads. */
export default function Experience3D() {
  useDocumentTitle('A cadeira em 3D');
  const navigate = useNavigate();
  const { reduced } = useMotionPref();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewer = useRef<ChairViewer | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [focus, setFocus] = useState<FocusName>('geral');
  const [auto, setAuto] = useState(!reduced);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    track('experience_3d_open');
    let disposed = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    (async () => {
      try {
        await document.fonts.load('italic 100px "Bodoni Moda Variable"').catch(() => undefined);
        const { createChairViewer } = await import('@/babylon/chairScene');
        if (disposed) return;
        viewer.current = createChairViewer(canvas, { reduced, onContextLost: () => setStatus('fallback') });
        setStatus('ready');
      } catch {
        if (!disposed) setStatus('fallback');
      }
    })();
    const t = setTimeout(() => setHint(false), 4500);
    return () => {
      disposed = true;
      clearTimeout(t);
      viewer.current?.dispose();
      viewer.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (f: FocusName) => {
    setFocus(f);
    viewer.current?.focus(f);
    setHint(false);
  };
  const current = focusOptions.find((f) => f.id === focus)!;

  return (
    <div className="fixed inset-0 flex flex-col bg-ink">
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] md:px-8">
        <button onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))} className="grid h-12 w-12 place-items-center rounded-full border hairline bg-ink/60" aria-label="Sair da experiência 3D">
          <Icon name="arrowLeft" />
        </button>
        <div className="text-center">
          <p className="font-display text-xl italic">A cadeira, em 3D</p>
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted">Modelo conceitual</p>
        </div>
        <button
          onClick={() => {
            setAuto(!auto);
            viewer.current?.setAutoRotate(!auto);
          }}
          className="grid h-12 w-12 place-items-center rounded-full border hairline bg-ink/60"
          aria-label={auto ? 'Parar rotação automática' : 'Ativar rotação automática'}
          aria-pressed={auto}
          disabled={status !== 'ready'}
        >
          <Icon name={auto ? 'pause' : 'play'} />
        </button>
      </header>

      <main id="conteudo" className="relative flex-1">
        <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full touch-none outline-none transition-opacity duration-700 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`} aria-label="Visualização 3D interativa da poltrona. Arraste para girar e use pinça ou roda do mouse para aproximar." role="img" />
        {status === 'loading' && (
          <div className="absolute inset-0 grid place-items-center" role="status">
            <div className="flex flex-col items-center gap-4">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-brass/20 border-t-brass" />
              <span className="text-sm text-muted">Preparando o ateliê…</span>
            </div>
          </div>
        )}
        {status === 'fallback' && (
          <div className="absolute inset-0 overflow-y-auto px-4 pb-8 pt-4">
            <p className="mx-auto max-w-md text-center text-sm text-muted">Seu aparelho não conseguiu abrir a visualização 3D. Veja a poltrona em fotos:</p>
            <div className="mx-auto mt-4 grid max-w-3xl gap-3 md:grid-cols-2">
              <SmartImage id="poltrona-horizontal" alt="Poltrona de barbeiro em couro, vista lateral" className="rounded-2xl" />
              <SmartImage id="poltrona-vertical" alt="Poltrona de barbeiro em couro, vista frontal" className="rounded-2xl" />
            </div>
          </div>
        )}
        {status === 'ready' && hint && (
          <p className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-ink/70 px-4 py-2 text-[12px] text-ivory/80">Arraste para girar · pinça para aproximar</p>
        )}
      </main>

      <footer className="relative z-10 space-y-4 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 md:px-8">
        <p className="mx-auto max-w-md text-center text-[14px] leading-relaxed text-ivory/80" aria-live="polite">{current.text}</p>
        <div role="group" aria-label="Pontos de vista" className="no-scrollbar mx-auto flex max-w-xl justify-start gap-2 overflow-x-auto md:justify-center">
          {focusOptions.map((f) => (
            <button key={f.id} onClick={() => choose(f.id)} aria-pressed={focus === f.id} disabled={status !== 'ready'} className={`min-h-11 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition-colors disabled:opacity-40 ${focus === f.id ? 'border-brass bg-brass text-ink' : 'hairline bg-ink/60'}`}>
              {f.label}
            </button>
          ))}
          <button onClick={() => choose('geral')} disabled={status !== 'ready'} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border hairline bg-ink/60 disabled:opacity-40" aria-label="Restaurar visão">
            <Icon name="reset" className="h-[18px] w-[18px]" />
          </button>
        </div>
        <Link to="/agendar" className="mx-auto flex min-h-14 max-w-md items-center justify-center gap-2 rounded-full bg-brass text-[15px] font-semibold text-ink">
          Reservar esta cadeira <Icon name="arrowRight" className="h-[18px] w-[18px]" />
        </Link>
      </footer>
    </div>
  );
}

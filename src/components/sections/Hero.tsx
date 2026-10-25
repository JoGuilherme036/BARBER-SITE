import { motion } from 'framer-motion';
import { site } from '@/config/site';
import { useMotionPref } from '@/hooks/useMotionPref';
import { useOpenStatus } from '@/hooks/useMisc';
import { statusLabel } from '@/lib/hours';
import { track } from '@/lib/analytics';
import { LinkButton, Button } from '../ui/Button';
import { scrollToSection } from '../layout/nav';

const ease = [0.16, 1, 0.3, 1] as const;

function coord(v: number, pos: string, neg: string) {
  const a = Math.abs(v);
  const d = Math.floor(a);
  const m = Math.round((a - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}′${v >= 0 ? pos : neg}`;
}

export function Hero() {
  const { reduced } = useMotionPref();
  const status = useOpenStatus();
  const label = statusLabel(status);
  const line = (delay: number) => ({ initial: { y: '110%' }, animate: { y: '0%' }, transition: { duration: reduced ? 0 : 0.9, delay: reduced ? 0 : delay, ease } });
  const fade = (delay: number) => ({ initial: { opacity: 0, y: reduced ? 0 : 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduced ? 0 : 0.7, delay: reduced ? 0 : delay, ease } });

  return (
    <section aria-labelledby="hero-title" className="relative z-10 flex min-h-[100svh] min-h-[640px] flex-col">
      <div className="container-x flex flex-1 flex-col justify-end pb-10 pt-28 md:justify-center md:pb-24">
        <motion.p {...fade(0.1)} className="mb-6 inline-flex w-fit items-center gap-2.5 rounded-full border hairline bg-ink/50 px-3.5 py-2 text-[12px] backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            {status.open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${status.open ? 'bg-emerald-400' : 'bg-muted'}`} />
          </span>
          <span className="font-semibold">{label.short}</span>
          <span className="text-muted">· {label.detail}</span>
        </motion.p>

        <h1 id="hero-title" className="display text-[clamp(3.6rem,17vw,10.5rem)]">
          <span className="block overflow-hidden pb-[0.06em]"><motion.span className="block" {...line(0.15)}>Precisão</motion.span></span>
          <span className="block overflow-hidden pb-[0.06em]"><motion.span className="block" {...line(0.25)}>sob luz</motion.span></span>
          <span className="block overflow-hidden pb-[0.1em]">
            <motion.span className="brass-text block italic" {...line(0.35)}>âmbar.</motion.span>
          </span>
        </h1>

        <motion.p {...fade(0.55)} className="mt-6 max-w-md text-[15px] leading-relaxed text-ivory/90 [text-shadow:0_2px_18px_rgb(0_0_0/0.9)] sm:text-base">
          Corte, barba e ritual de toalha quente num ateliê feito para a noite da cidade. Hora marcada, sem fila, sem pressa.
        </motion.p>

        <motion.div {...fade(0.65)} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <LinkButton to="/agendar" size="lg" iconRight="arrowRight" onClick={() => track('cta_book_click', { from: 'hero' })}>
            Agendar horário
          </LinkButton>
          <Button variant="ghost" size="lg" onClick={() => scrollToSection('servicos', reduced)}>
            Ver serviços e preços
          </Button>
        </motion.div>
      </div>

      {/* Editorial metadata: desktop only, never essential. */}
      <motion.div {...fade(0.9)} aria-hidden="true" className="pointer-events-none absolute bottom-24 right-12 hidden flex-col items-end gap-2 text-right lg:flex">
        <span className="font-display text-sm italic text-brass-light">Capítulo I</span>
        <span className="text-[11px] uppercase tracking-[0.3em] text-muted">A chegada</span>
        <span className="mt-3 font-mono text-[11px] tracking-widest text-muted/80">
          {coord(site.address.lat, 'N', 'S')} · {coord(site.address.lng, 'L', 'O')}
        </span>
      </motion.div>

      <motion.div {...fade(1)} aria-hidden="true" className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex">
        <span className="text-[10px] uppercase tracking-[0.4em] text-muted">Role para entrar</span>
        <span className="relative h-12 w-px overflow-hidden bg-ivory/15">
          {!reduced && <motion.span className="absolute inset-x-0 top-0 h-1/2 bg-brass" animate={{ y: ['-100%', '200%'] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />}
        </span>
      </motion.div>
    </section>
  );
}

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { whatsappLink, waMessages } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import { useMotionPref } from '@/hooks/useMotionPref';
import { SectionHeading } from '../ui/SectionHeading';
import { SmartImage } from '../ui/SmartImage';
import { Reveal } from '../ui/Reveal';
import { Icon } from '../ui/Icon';

export function Space() {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useMotionPref();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-6%', '6%']);

  return (
    <section aria-labelledby="espaco-title" className="relative z-10 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-ink/85 to-transparent" />
      <div className="container-x relative" id="espaco-title">
        <SectionHeading chapter="VII" label="O espaço" lines={['Um ateliê', <em key="e" className="brass-text">para a noite.</em>]} intro="Mármore escuro, couro, latão e luz baixa. Tudo pensado para você desligar por uma hora." />
      </div>

      <div className="container-x relative mt-12 grid gap-4 md:grid-cols-12 md:gap-6">
        <Reveal className="md:col-span-8">
          <div ref={ref} className="overflow-hidden rounded-[1.75rem] border hairline">
            <motion.div style={{ y, scale: 1.12 }}>
              <SmartImage id="ambiente-principal" alt="Salão da barbearia com cadeiras de couro e luz âmbar" sizes="(min-width: 768px) 66vw, 100vw" ratio="16 / 10" />
            </motion.div>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="md:col-span-4">
          <Link
            to="/experiencia-3d"
            onClick={() => track('experience_3d_open', { from: 'space' })}
            className="group relative flex h-full min-h-[26rem] flex-col justify-end overflow-hidden rounded-[1.75rem] border hairline"
          >
            <SmartImage id="poltrona-vertical" alt="Poltrona de barbeiro em couro" sizes="(min-width: 768px) 33vw, 100vw" className="!absolute inset-0 h-full !aspect-auto" imgClassName="transition-transform duration-[1.4s] ease-expo group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            <span className="relative p-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-brass/50 bg-ink/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brass-light">
                <Icon name="cube" className="h-4 w-4" /> Interativo
              </span>
              <span className="mt-4 block font-display text-3xl italic">Explore a cadeira em 3D</span>
              <span className="mt-2 flex items-center gap-2 text-sm text-muted">
                Gire, aproxime e veja os detalhes <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </span>
          </Link>
        </Reveal>

        <Reveal delay={0.05} className="md:col-span-5">
          <div className="grid h-full grid-cols-[1fr_1.1fr] overflow-hidden rounded-[1.75rem] border hairline bg-ink-2">
            <SmartImage id="produto-pomada" alt="Pote de pomada capilar sobre pedra escura" sizes="(min-width: 768px) 20vw, 45vw" className="h-full !aspect-auto" />
            <div className="flex flex-col justify-between gap-4 p-5">
              <div>
                <p className="eyebrow">Na bancada</p>
                <p className="mt-2 font-display text-2xl italic leading-tight">Pomada matte da casa</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">Fixação média, efeito seco. A mesma que usamos na finalização.</p>
              </div>
              <a href={whatsappLink(waMessages.product('a pomada matte da casa'))} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-brass-light">
                <Icon name="whatsapp" className="h-4 w-4" /> Perguntar disponibilidade
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="md:col-span-7">
          <div className="overflow-hidden rounded-[1.75rem] border hairline">
            <SmartImage id="ritual-bancada" alt="Bancada com pincel, tesoura, pente e toalha" sizes="(min-width: 768px) 58vw, 100vw" ratio="16 / 9" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

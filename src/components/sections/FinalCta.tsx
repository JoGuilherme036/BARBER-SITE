import { whatsappLink, waMessages } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import { LinkButton, ExternalButton } from '../ui/Button';
import { MaskLines, Reveal } from '../ui/Reveal';

/** Last film window: the tools close-up frames play behind the closing call to action. */
export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="relative z-10 flex min-h-[92svh] items-end pb-20 pt-32 md:items-center md:pb-24">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow flex items-center gap-3">
            <span className="font-display text-[13px] normal-case italic tracking-normal text-brass-light">XI</span>
            <span className="h-px w-10 bg-brass/50" />
            Epílogo
          </p>
        </Reveal>
        <MaskLines as="h2" lines={['Sua cadeira', <em key="e" className="brass-text">está pronta.</em>]} className="display mt-5 text-[clamp(3.2rem,14vw,9rem)] drop-shadow-[0_6px_40px_rgb(0_0_0/0.7)]" />
        <Reveal delay={0.15} className="mt-10 flex flex-col gap-3 sm:flex-row">
          <LinkButton to="/agendar" size="lg" iconRight="arrowRight" onClick={() => track('cta_book_click', { from: 'final' })}>
            Agendar agora
          </LinkButton>
          <ExternalButton href={whatsappLink(waMessages.general())} variant="ghost" size="lg" icon="whatsapp" onClick={() => track('whatsapp_click', { from: 'final' })}>
            Falar no WhatsApp
          </ExternalButton>
        </Reveal>
      </div>
    </section>
  );
}

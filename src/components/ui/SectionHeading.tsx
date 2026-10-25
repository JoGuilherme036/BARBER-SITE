import type { ReactNode } from 'react';
import { MaskLines, Reveal } from './Reveal';

export function SectionHeading({ chapter, label, lines, intro, align = 'left', id }: { chapter: string; label: string; lines: ReactNode[]; intro?: string; align?: 'left' | 'center'; id?: string }) {
  return (
    <header className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <Reveal>
        <p className={`eyebrow flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}>
          <span className="font-display text-[13px] normal-case tracking-normal italic text-brass-light">{chapter}</span>
          <span className="h-px w-8 bg-brass/50" />
          {label}
        </p>
      </Reveal>
      <MaskLines lines={lines} className="display mt-5 text-[clamp(2.4rem,9vw,5.2rem)]" />
      {intro && (
        <Reveal delay={0.1}>
          <p id={id} className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
            {intro}
          </p>
        </Reveal>
      )}
    </header>
  );
}

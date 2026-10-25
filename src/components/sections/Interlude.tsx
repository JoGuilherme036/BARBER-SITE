import { MaskLines, Reveal } from '../ui/Reveal';
import type { ReactNode } from 'react';

/** A transparent "window" between sheets so the scroll film takes the stage. */
export function Interlude({ chapter, label, lines, height = 'min-h-[78svh]' }: { chapter: string; label: string; lines: ReactNode[]; height?: string }) {
  return (
    <section aria-label={label} className={`relative z-10 flex items-center ${height}`}>
      <div className="container-x">
        <Reveal>
          <p className="eyebrow flex items-center gap-3">
            <span className="font-display text-[13px] normal-case italic tracking-normal text-brass-light">{chapter}</span>
            <span className="h-px w-10 bg-brass/50" />
            {label}
          </p>
        </Reveal>
        <MaskLines lines={lines} className="display mt-5 max-w-3xl text-[clamp(2.2rem,8.5vw,5.6rem)] italic drop-shadow-[0_4px_30px_rgb(0_0_0/0.6)]" />
      </div>
    </section>
  );
}

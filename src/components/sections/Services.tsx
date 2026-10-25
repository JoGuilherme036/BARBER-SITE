import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { categories, services, type ServiceCategory } from '@/config/catalog';
import { site } from '@/config/site';
import { formatDuration, formatPrice } from '@/lib/format';
import { whatsappLink, waMessages } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import { SectionHeading } from '../ui/SectionHeading';
import { SmartImage } from '../ui/SmartImage';
import { Icon } from '../ui/Icon';

const ease = [0.16, 1, 0.3, 1] as const;

export function Services() {
  const [filter, setFilter] = useState<ServiceCategory | 'all'>('all');
  const [openId, setOpenId] = useState<string>(services[0].id);
  const list = services.filter((s) => filter === 'all' || s.category === filter);
  const active = services.find((s) => s.id === openId) ?? list[0];
  const activeImage = active?.image ?? 'ritual-bancada';

  return (
    <section id="servicos" aria-labelledby="servicos-title" className="relative z-10 scroll-mt-20 rounded-[2rem] slab py-20 md:rounded-[3rem] md:py-28">
      <div className="container-x">
        <div id="servicos-title">
          <SectionHeading
            chapter="III"
            label="Serviços"
            lines={['O menu', <em key="e" className="brass-text">da casa.</em>]}
            intro="Preço e duração sempre à vista. Toque em um serviço para ver os detalhes e agendar já com ele selecionado."
          />
        </div>

        <div role="group" aria-label="Filtrar serviços" className="no-scrollbar -mx-5 mt-10 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          {[{ id: 'all' as const, label: 'Todos' }, ...categories].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              aria-pressed={filter === c.id}
              className={`min-h-11 shrink-0 rounded-full border px-5 text-[13px] font-semibold transition-colors ${
                filter === c.id ? 'border-brass bg-brass text-ink' : 'hairline text-ivory/80 hover:border-brass/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <ul className="border-t hairline">
            {list.map((s, i) => {
              const open = s.id === openId;
              return (
                <li key={s.id} className="border-b hairline">
                  <button
                    onClick={() => setOpenId(open ? '' : s.id)}
                    aria-expanded={open}
                    aria-controls={`svc-${s.id}`}
                    className="group grid w-full grid-cols-[2.2rem_1fr_auto] items-baseline gap-x-3 py-5 text-left md:py-6"
                  >
                    <span className="font-display text-sm italic text-brass">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-display text-[1.65rem] leading-tight transition-transform duration-500 ease-expo group-hover:translate-x-1 md:text-[2rem]">
                      {s.name}
                    </span>
                    <span className="text-right">
                      <span className="block font-display text-xl tabular-nums text-brass-light md:text-2xl">{formatPrice(s.priceCents)}</span>
                      <span className="block text-[12px] text-muted">{formatDuration(s.durationMin)}</span>
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        id={`svc-${s.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-5 pb-7 pl-[2.95rem] sm:grid-cols-[1fr_auto] sm:items-end">
                          <div>
                            <p className="max-w-md text-[15px] leading-relaxed text-muted">{s.description}</p>
                            {s.includes && <p className="mt-2 text-[13px] text-ivory/70">Inclui: {s.includes.map((id) => services.find((x) => x.id === id)?.name).join(' + ')}</p>}
                            {s.image && <SmartImage id={s.image} alt={s.name} sizes="80vw" ratio="16 / 10" className="mt-5 rounded-2xl lg:hidden" focal="50% 30%" />}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/agendar?servico=${s.id}`}
                              onClick={() => track('cta_book_click', { from: 'service', service: s.id })}
                              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brass px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-brass-light active:scale-[0.97]"
                            >
                              Agendar este <Icon name="arrowRight" className="h-4 w-4" />
                            </Link>
                            <a
                              href={whatsappLink(waMessages.service(s.name))}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => track('whatsapp_click', { from: 'service' })}
                              aria-label={`Perguntar sobre ${s.name} no WhatsApp`}
                              className="grid h-12 w-12 place-items-center rounded-full border hairline hover:border-brass/60"
                            >
                              <Icon name="whatsapp" />
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>

          {/* Desktop: sticky photograph that follows the selected service. */}
          <div className="relative hidden lg:block">
            <div className="sticky top-28">
              <div className="relative overflow-hidden rounded-[2rem] border hairline">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div key={activeImage} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease }}>
                    <SmartImage id={activeImage} alt={active?.name ?? ''} sizes="40vw" ratio="4 / 5" focal="50% 30%" />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-6">
                  <p className="font-display text-2xl italic">{active?.name}</p>
                  <p className="text-sm text-muted">{active && `${formatDuration(active.durationMin)} · ${formatPrice(active.priceCents)}`}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {site.demo && <p className="mt-6 text-[12px] text-muted/80">Valores e serviços de demonstração.</p>}
      </div>
    </section>
  );
}

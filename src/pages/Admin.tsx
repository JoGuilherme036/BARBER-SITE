import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { proById, serviceById, team } from '@/config/catalog';
import { site } from '@/config/site';
import { adminApi, bookingApi } from '@/booking/api';
import { clearAdminSession } from '@/booking/cloudflareApi';
import { DEMO_ADMIN_PASSWORD } from '@/booking/localApi';
import { notifyScheduleChanged, useScheduleVersion } from '@/booking/sync';
import { BookingError, type Block, type Booking, type BookingStatus } from '@/booking/types';
import { formatPrice } from '@/lib/format';
import { formatRanges } from '@/lib/hours';
import { addDays, dayOfMonth, formatDayLong, formatDayShort, shopNow, weekdayOf } from '@/lib/time';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Icon } from '@/components/ui/Icon';
import { Monogram } from '@/components/ui/Monogram';

const clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: site.timeZone });
const clockSec = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: site.timeZone });
const statusLabel: Record<BookingStatus, string> = { confirmed: 'Confirmado', completed: 'Concluído', no_show: 'Faltou', cancelled: 'Cancelado' };
const statusStyle: Record<BookingStatus, string> = {
  confirmed: 'bg-emerald-400/15 text-emerald-300',
  completed: 'bg-brass/20 text-brass-light',
  no_show: 'bg-danger/15 text-danger',
  cancelled: 'bg-ivory/10 text-muted line-through',
};
const field = 'mt-1.5 block w-full rounded-xl border hairline bg-ink px-3.5 py-3 text-ivory focus:border-brass focus:outline-none';

export default function Admin() {
  useDocumentTitle('Painel da barbearia');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(bookingApi.mode === 'live');

  // A live session survives a refresh (token in sessionStorage); confirm it is still valid.
  useEffect(() => {
    if (bookingApi.mode !== 'live') return;
    adminApi
      .day(shopNow().day)
      .then(() => setAuthed(true))
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="grid min-h-[100svh] place-items-center text-muted">Carregando…</div>;
  return authed ? (
    <Dashboard
      onLogout={() => {
        clearAdminSession();
        setAuthed(false);
      }}
    />
  ) : (
    <Login onSuccess={() => setAuthed(true)} />
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'wrong' | 'error'>('idle');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState('loading');
    try {
      await adminApi.login(password);
      onSuccess();
    } catch (err) {
      setState(err instanceof BookingError && err.code === 'unauthorized' ? 'wrong' : 'error');
    }
  };
  return (
    <main id="conteudo" className="grid min-h-[100svh] place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border hairline bg-ink-2 p-7">
        <Monogram className="h-12 w-12" />
        <h1 className="display mt-6 text-4xl">
          Painel da <em className="brass-text">barbearia</em>
        </h1>
        <p className="mt-2 text-sm text-muted">Agenda do dia, bloqueios de horário, dia ou barbeiro.</p>
        <label className="mt-6 block">
          <span className="text-sm font-medium">Senha</span>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} required />
        </label>
        <div aria-live="polite" className="mt-2 min-h-5 text-[13px] text-danger">
          {state === 'wrong' && 'Senha incorreta.'}
          {state === 'error' && 'Não foi possível conectar. Tente de novo.'}
        </div>
        <button type="submit" disabled={state === 'loading'} className="mt-3 min-h-12 w-full rounded-full bg-brass text-[15px] font-semibold text-ink disabled:opacity-50">
          {state === 'loading' ? 'Entrando…' : 'Entrar'}
        </button>
        {bookingApi.mode === 'demo' && (
          <p className="mt-4 rounded-xl border border-brass/30 bg-brass/10 px-3 py-2 text-[12px] text-brass-light">
            Modo demonstração: senha <b>{DEMO_ADMIN_PASSWORD}</b>. Os dados ficam só neste navegador.
          </p>
        )}
        <Link to="/" className="mt-5 inline-flex min-h-11 items-center gap-2 text-[13px] text-muted hover:text-ivory">
          <Icon name="arrowLeft" className="h-4 w-4" /> Voltar ao site
        </Link>
      </form>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const today = shopNow().day;
  const [day, setDay] = useState(today);
  const [filter, setFilter] = useState<string>('all');
  const [data, setData] = useState<{ bookings: Booking[]; blocks: Block[] } | null>(null);
  const [error, setError] = useState(false);
  const [sheet, setSheet] = useState(false);
  const { tick, syncedAt } = useScheduleVersion(5_000);

  const load = useCallback(async () => {
    try {
      setData(await adminApi.day(day));
      setError(false);
    } catch (e) {
      if (e instanceof BookingError && e.code === 'unauthorized') onLogout();
      else setError(true);
    }
  }, [day, onLogout]);

  useEffect(() => {
    setData(null);
  }, [day]);
  useEffect(() => {
    load();
  }, [load, tick]);

  const changed = () => {
    notifyScheduleChanged();
    load();
  };

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => addDays(today, i - 3)), [today]);
  const pros = team.filter((p) => filter === 'all' || p.id === filter);
  const active = data?.bookings.filter((b) => b.status !== 'cancelled') ?? [];
  const revenue = active.reduce((t, b) => t + b.totalCents, 0);
  const wholeDay = data?.blocks.filter((b) => !b.startTime) ?? [];

  return (
    <div className="min-h-[100svh] pb-32">
      <header className="sticky top-0 z-30 border-b hairline bg-ink/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Monogram className="h-9 w-9" />
            <div className="leading-tight">
              <p className="font-display text-lg italic">Agenda</p>
              <p className="flex items-center gap-1.5 text-[11px] text-muted" aria-live="polite">
                <span className={`h-1.5 w-1.5 rounded-full ${syncedAt ? 'bg-emerald-400' : 'bg-muted'}`} />
                {syncedAt ? `Sincronizado ${clockSec.format(syncedAt)}` : 'Conectando…'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSheet(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brass px-4 text-[14px] font-semibold text-ink">
              <Icon name="close" className="h-4 w-4 rotate-45" /> Bloquear
            </button>
            <button onClick={onLogout} className="min-h-11 rounded-full border hairline px-4 text-[13px]">
              Sair
            </button>
          </div>
        </div>
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 pb-3" role="listbox" aria-label="Dia">
          {days.map((d) => {
            const on = d === day;
            const closed = site.hours[weekdayOf(d)].length === 0;
            return (
              <button
                key={d}
                role="option"
                aria-selected={on}
                onClick={() => setDay(d)}
                className={`flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 ${on ? 'border-brass bg-brass text-ink' : 'hairline'} ${closed && !on ? 'opacity-40' : ''}`}
              >
                <span className="text-[10px] font-semibold uppercase">{d === today ? 'Hoje' : formatDayShort(d)}</span>
                <span className="font-display text-xl leading-tight">{dayOfMonth(d)}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-6xl px-4 pt-6">
        {bookingApi.mode === 'demo' && (
          <p className="mb-4 rounded-xl border border-brass/30 bg-brass/10 px-4 py-2 text-[13px] text-brass-light">
            Modo demonstração: abra o site em outra aba para ver os bloqueios aparecerem lá na hora.
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[clamp(2rem,7vw,3rem)]">{formatDayLong(day)}</h1>
            <p className="mt-1 text-sm text-muted">
              {active.length} {active.length === 1 ? 'atendimento' : 'atendimentos'} · {formatPrice(revenue)} previstos · horário da casa {formatRanges(site.hours[weekdayOf(day)])}
            </p>
          </div>
          <div role="group" aria-label="Barbeiro" className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {[{ id: 'all', name: 'Todos' }, ...team].map((p) => (
              <button key={p.id} onClick={() => setFilter(p.id)} aria-pressed={filter === p.id} className={`min-h-10 shrink-0 rounded-full border px-4 text-[13px] font-semibold ${filter === p.id ? 'border-brass bg-brass text-ink' : 'hairline'}`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {wholeDay.length > 0 && (
          <div className="mt-5 space-y-2">
            {wholeDay.map((b) => (
              <BlockRow key={b.id} block={b} onRemoved={changed} />
            ))}
          </div>
        )}

        {error && <p className="mt-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">Sem conexão com a agenda. Tentando de novo…</p>}

        <div className={`mt-6 grid gap-4 ${pros.length > 1 ? 'md:grid-cols-3' : ''}`}>
          {pros.map((p) => {
            const schedule = p.schedule[weekdayOf(day)] ?? [];
            const items = [
              ...(data?.bookings.filter((b) => b.proId === p.id).map((b) => ({ at: b.start, kind: 'booking' as const, b })) ?? []),
              ...(data?.blocks.filter((b) => b.startTime && (b.proId === p.id || b.proId === null)).map((b) => ({ at: b.startTime!, kind: 'block' as const, b })) ?? []),
            ].sort((x, y) => (x.kind === 'block' ? x.at : clock.format(new Date(x.at))).localeCompare(y.kind === 'block' ? y.at : clock.format(new Date(y.at))));
            const off = data?.blocks.some((b) => !b.startTime && (b.proId === p.id || b.proId === null));
            return (
              <section key={p.id} aria-label={p.name} className="rounded-3xl border hairline bg-ink-2 p-4">
                <header className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-display text-2xl italic">{p.name}</h2>
                  <span className="text-[12px] text-muted">{off ? 'Bloqueado o dia todo' : schedule.length ? formatRanges(schedule) : 'Folga'}</span>
                </header>
                {!data ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <span key={i} className="block h-20 animate-pulse rounded-2xl bg-ivory/5" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed hairline px-4 py-6 text-center text-sm text-muted">Nenhum horário marcado.</p>
                ) : (
                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {items.map((it) => (
                        <motion.li key={it.kind + (it.kind === 'booking' ? it.b.code : it.b.id)} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          {it.kind === 'booking' ? <BookingCard booking={it.b} onChanged={changed} /> : <BlockRow block={it.b} onRemoved={changed} compact />}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </main>

      <AnimatePresence>{sheet && <BlockSheet day={day} onClose={() => setSheet(false)} onCreated={changed} />}</AnimatePresence>
    </div>
  );
}

function BookingCard({ booking: b, onChanged }: { booking: Booking; onChanged: () => void }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = async (status: Exclude<BookingStatus, 'confirmed'>) => {
    setBusy(true);
    try {
      await adminApi.setStatus(b.code, status);
      onChanged();
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };
  const phone = b.customer.phone;
  const pretty = phone.length === 11 ? `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}` : phone;
  return (
    <article className={`rounded-2xl border hairline bg-ink p-4 ${b.status === 'cancelled' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-2xl tabular-nums leading-none text-brass-light">
          {clock.format(new Date(b.start))}
          <span className="text-base text-muted">–{clock.format(new Date(b.end))}</span>
        </p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[b.status]}`}>{statusLabel[b.status]}</span>
      </div>
      <p className="mt-2 text-[15px] font-semibold">{b.customer.name}</p>
      <p className="text-[13px] text-muted">
        {b.serviceIds.map((id) => serviceById(id)?.name ?? id).join(' + ')} · {formatPrice(b.totalCents)}
      </p>
      {b.customer.notes && <p className="mt-1 text-[13px] italic text-ivory/70">“{b.customer.notes}”</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href={`https://wa.me/55${phone}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border hairline px-3 text-[12px]">
          <Icon name="whatsapp" className="h-4 w-4 text-brass" /> {pretty}
        </a>
        <span className="font-mono text-[11px] text-muted">{b.code}</span>
      </div>
      {b.status === 'confirmed' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {confirmCancel ? (
            <>
              <button disabled={busy} onClick={() => set('cancelled')} className="min-h-10 rounded-full bg-danger px-4 text-[12px] font-semibold text-ink">
                Confirmar cancelamento
              </button>
              <button onClick={() => setConfirmCancel(false)} className="min-h-10 rounded-full border hairline px-4 text-[12px]">
                Manter
              </button>
            </>
          ) : (
            <>
              <button disabled={busy} onClick={() => set('completed')} className="min-h-10 rounded-full border border-brass/50 px-4 text-[12px] font-semibold text-brass-light">
                Concluir
              </button>
              <button disabled={busy} onClick={() => set('no_show')} className="min-h-10 rounded-full border hairline px-4 text-[12px]">
                Faltou
              </button>
              <button disabled={busy} onClick={() => setConfirmCancel(true)} className="min-h-10 rounded-full border hairline px-4 text-[12px] hover:border-danger/60">
                Cancelar
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

function BlockRow({ block: b, onRemoved, compact }: { block: Block; onRemoved: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const who = b.proId ? proById(b.proId)?.name ?? b.proId : 'Toda a barbearia';
  const when = b.startTime ? `${b.startTime}–${b.endTime}` : 'Dia inteiro';
  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.removeBlock(b.id);
      onRemoved();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border border-dashed border-brass/40 px-4 ${compact ? 'py-3' : 'py-3.5'} bg-[repeating-linear-gradient(135deg,rgb(var(--brass)/0.07)_0_8px,transparent_8px_16px)]`}
    >
      <div className="min-w-0">
        <p className="text-[14px] font-semibold">
          Bloqueado · {when}
          {!compact || !b.proId ? <span className="font-normal text-muted"> · {who}</span> : null}
        </p>
        {b.reason && <p className="truncate text-[12px] text-muted">{b.reason}</p>}
      </div>
      <button disabled={busy} onClick={remove} className="min-h-10 shrink-0 rounded-full border hairline px-3 text-[12px] hover:border-brass/60">
        {busy ? 'Removendo…' : 'Desbloquear'}
      </button>
    </div>
  );
}

function BlockSheet({ day, onClose, onCreated }: { day: string; onClose: () => void; onCreated: () => void }) {
  const [proId, setProId] = useState<string>('all');
  const [mode, setMode] = useState<'day' | 'time'>('time');
  const [from, setFrom] = useState(day);
  const [to, setTo] = useState(day);
  const [startTime, setStart] = useState('12:00');
  const [endTime, setEnd] = useState('13:00');
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [result, setResult] = useState<{ created: number; conflicts: Booking[] } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const invalid = to < from || (mode === 'time' && endTime <= startTime);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    setState('saving');
    try {
      const r = await adminApi.addBlock({
        proId: proId === 'all' ? null : proId,
        from,
        to,
        ...(mode === 'time' ? { startTime, endTime } : {}),
        reason,
      });
      setResult(r);
      setState('idle');
      onCreated();
    } catch {
      setState('error');
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Bloquear horário"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border hairline bg-ink-2 p-6 pb-[max(env(safe-area-inset-bottom),24px)] md:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="display text-3xl">Bloquear</h2>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border hairline" aria-label="Fechar">
            <Icon name="close" />
          </button>
        </div>

        {result ? (
          <div className="mt-5 space-y-4" aria-live="polite">
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-[14px]">
              Bloqueio salvo em {result.created} {result.created === 1 ? 'dia' : 'dias'}. Já aparece como indisponível em todos os aparelhos.
            </p>
            {result.conflicts.length > 0 && (
              <div className="rounded-xl border border-danger/40 bg-danger/10 p-4">
                <p className="text-[14px] font-semibold">Esses clientes já tinham horário nesse período. Avise e remarque:</p>
                <ul className="mt-3 space-y-2">
                  {result.conflicts.map((c) => (
                    <li key={c.code} className="flex items-center justify-between gap-3 text-[13px]">
                      <span>
                        {formatDayShort(c.day)} {dayOfMonth(c.day)} · {c.time} · {c.customer.name} ({proById(c.proId)?.name})
                      </span>
                      <a
                        href={`https://wa.me/55${c.customer.phone}?text=${encodeURIComponent(`Olá, ${c.customer.name}! Precisamos remarcar seu horário de ${formatDayLong(c.day)} às ${c.time} (código ${c.code}). Qual outro horário fica bom para você?`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-brass px-3 text-[12px] font-semibold text-ink"
                      >
                        <Icon name="whatsapp" className="h-4 w-4" /> Avisar
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={onClose} className="min-h-12 w-full rounded-full bg-brass text-[15px] font-semibold text-ink">
              Pronto
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-5">
            <fieldset>
              <legend className="text-sm font-medium">Quem</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {[{ id: 'all', name: 'Toda a barbearia' }, ...team].map((p) => (
                  <button type="button" key={p.id} onClick={() => setProId(p.id)} aria-pressed={proId === p.id} className={`min-h-11 rounded-full border px-4 text-[13px] font-semibold ${proId === p.id ? 'border-brass bg-brass text-ink' : 'hairline'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium">O quê</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    ['time', 'Um horário'],
                    ['day', 'Dia inteiro'],
                  ] as const
                ).map(([id, label]) => (
                  <button type="button" key={id} onClick={() => setMode(id)} aria-pressed={mode === id} className={`min-h-11 rounded-xl border text-[13px] font-semibold ${mode === id ? 'border-brass bg-brass/15 text-brass-light' : 'hairline'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-sm font-medium">De</span>
                <input id="block-from" type="date" value={from} onChange={(e) => (setFrom(e.target.value), e.target.value > to && setTo(e.target.value))} className={field} required />
              </label>
              <label>
                <span className="text-sm font-medium">Até</span>
                <input id="block-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={field} required />
              </label>
            </div>

            {mode === 'time' && (
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-sm font-medium">Início</span>
                  <input id="block-start" type="time" step={900} value={startTime} onChange={(e) => setStart(e.target.value)} className={field} required />
                </label>
                <label>
                  <span className="text-sm font-medium">Fim</span>
                  <input id="block-end" type="time" step={900} value={endTime} onChange={(e) => setEnd(e.target.value)} className={field} required />
                </label>
              </div>
            )}

            <label className="block">
              <span className="text-sm font-medium">
                Motivo <span className="text-muted">(opcional, só a equipe vê)</span>
              </span>
              <input id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: almoço, curso, férias" maxLength={120} className={field} />
            </label>

            {invalid && <p className="text-[13px] text-danger">Confira as datas e os horários: o fim precisa ser depois do início.</p>}
            {state === 'error' && <p className="text-[13px] text-danger">Não foi possível salvar. Verifique a conexão e tente de novo.</p>}
            <button type="submit" disabled={invalid || state === 'saving'} className="min-h-12 w-full rounded-full bg-brass text-[15px] font-semibold text-ink disabled:opacity-40">
              {state === 'saving' ? 'Salvando…' : 'Salvar bloqueio'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

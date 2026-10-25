import { site } from '@/config/site';
import { normalizeBrPhone, isValidBrPhone } from '@/lib/phone';
import { shopInstant } from '@/lib/time';
import { eligiblePros, overlaps, proSlots, summarize, type BusyMap } from './availability';
import { BookingError, type Booking, type BookingApi, type CreateBookingRequest } from './types';

// DEMO adapter: simulates the server in the browser so the full flow can be tested
// without a backend. Data lives only on this device. Not a real schedule.

type Store = { bookings: Booking[]; idempotency: Record<string, string> };

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'rb.demo.bookings.v1';
const CODE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';

export function createLocalApi(storage: StorageLike, opts: { latencyMs?: number; now?: () => Date } = {}): BookingApi {
  const latency = opts.latencyMs ?? 450;
  const now = opts.now ?? (() => new Date());
  const wait = () => new Promise((r) => setTimeout(r, latency));

  const read = (): Store => {
    try {
      return JSON.parse(storage.getItem(KEY) ?? '') as Store;
    } catch {
      return { bookings: [], idempotency: {} };
    }
  };
  const write = (s: Store) => storage.setItem(KEY, JSON.stringify(s));

  const busyFor = (store: Store, day: string): BusyMap => {
    const map: BusyMap = {};
    for (const b of store.bookings) {
      if (b.status !== 'confirmed' || b.day !== day) continue;
      (map[b.proId] ??= []).push({ start: Date.parse(b.start), end: Date.parse(b.end) });
    }
    return map;
  };

  const newCode = (store: Store) => {
    let code = '';
    do {
      code = 'RB-' + Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
    } while (store.bookings.some((b) => b.code === code));
    return code;
  };

  return {
    mode: 'demo',

    async getBusy(day) {
      await wait();
      return busyFor(read(), day);
    },

    async create(req: CreateBookingRequest) {
      await wait();
      const store = read();
      const existing = store.idempotency[req.idempotencyKey];
      if (existing) return store.bookings.find((b) => b.code === existing)!;

      const name = req.customer.name.trim();
      if (name.length < 2 || !isValidBrPhone(req.customer.phone)) throw new BookingError('invalid');
      const { durationMin, priceCents, services } = summarize(req.serviceIds);
      if (!services.length) throw new BookingError('invalid');

      // Re-validate at "commit time": the slot must still be free for the chosen professional.
      const busy = busyFor(store, req.day);
      const candidates = eligiblePros(req.serviceIds).filter((p) => req.proId === 'any' || p.id === req.proId);
      const pro = candidates.find((p) => proSlots(p, req.day, durationMin, busy[p.id] ?? [], now()).includes(req.time));
      if (!pro) throw new BookingError('slot_taken');

      const start = shopInstant(req.day, req.time);
      const end = new Date(start.getTime() + durationMin * 60_000);
      const interval = { start: start.getTime(), end: end.getTime() };
      if ((busy[pro.id] ?? []).some((b) => overlaps(interval, b, site.booking.bufferMin * 60_000))) {
        throw new BookingError('slot_taken');
      }

      const booking: Booking = {
        code: newCode(store),
        status: 'confirmed',
        day: req.day,
        time: req.time,
        start: start.toISOString(),
        end: end.toISOString(),
        proId: pro.id,
        serviceIds: req.serviceIds,
        durationMin,
        totalCents: priceCents,
        customer: { ...req.customer, name, phone: normalizeBrPhone(req.customer.phone) },
        createdAt: now().toISOString(),
      };
      store.bookings.push(booking);
      store.idempotency[req.idempotencyKey] = booking.code;
      write(store);
      return booking;
    },

    async find(code, phone) {
      await wait();
      const c = code.trim().toUpperCase();
      return read().bookings.find((b) => b.code === c && b.customer.phone === normalizeBrPhone(phone)) ?? null;
    },

    async cancel(code, phone) {
      await wait();
      const store = read();
      const b = store.bookings.find((x) => x.code === code.trim().toUpperCase() && x.customer.phone === normalizeBrPhone(phone));
      if (!b) throw new BookingError('not_found');
      if (Date.parse(b.start) - now().getTime() < site.booking.cancelUntilHours * 3_600_000) throw new BookingError('too_late');
      b.status = 'cancelled';
      write(store);
      return b;
    },
  };
}

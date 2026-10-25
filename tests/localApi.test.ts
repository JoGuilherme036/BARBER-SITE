import { describe, expect, it } from 'vitest';
import { createLocalApi } from '@/booking/localApi';
import { BookingError } from '@/booking/types';
import { shopInstant } from '@/lib/time';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

const now = () => shopInstant('2026-11-03', '08:00');
const base = {
  serviceIds: ['corte-assinatura'],
  day: '2026-11-03',
  time: '10:00',
  customer: { name: 'Ana Teste', phone: '(11) 98765-4321' },
};

describe('local booking adapter', () => {
  it('creates a booking and is idempotent on retries', async () => {
    const api = createLocalApi(memoryStorage(), { latencyMs: 0, now });
    const a = await api.create({ ...base, proId: 'rafael', idempotencyKey: 'k1' });
    const b = await api.create({ ...base, proId: 'rafael', idempotencyKey: 'k1' });
    expect(a.code).toBe(b.code);
    expect(a.customer.phone).toBe('11987654321');
    expect((await api.getBusy('2026-11-03')).rafael).toHaveLength(1);
  });

  it('rejects an overlapping booking for the same professional', async () => {
    const api = createLocalApi(memoryStorage(), { latencyMs: 0, now });
    await api.create({ ...base, proId: 'rafael', idempotencyKey: 'k1' });
    await expect(api.create({ ...base, time: '10:30', proId: 'rafael', idempotencyKey: 'k2' })).rejects.toMatchObject({ code: 'slot_taken' });
  });

  it('assigns another professional for "any" when the first is busy, then runs out', async () => {
    const api = createLocalApi(memoryStorage(), { latencyMs: 0, now });
    const first = await api.create({ ...base, proId: 'any', idempotencyKey: 'a' });
    const second = await api.create({ ...base, proId: 'any', idempotencyKey: 'b' });
    expect(first.proId).not.toBe(second.proId);
    // Only rafael and bruno work on Tuesday for this service.
    await expect(api.create({ ...base, proId: 'any', idempotencyKey: 'c' })).rejects.toBeInstanceOf(BookingError);
  });

  it('validates customer data', async () => {
    const api = createLocalApi(memoryStorage(), { latencyMs: 0, now });
    await expect(api.create({ ...base, customer: { name: 'A', phone: '123' }, proId: 'rafael', idempotencyKey: 'x' })).rejects.toMatchObject({ code: 'invalid' });
  });

  it('finds by code + phone and cancels within the policy window', async () => {
    const api = createLocalApi(memoryStorage(), { latencyMs: 0, now });
    const b = await api.create({ ...base, proId: 'rafael', idempotencyKey: 'k1' });
    expect(await api.find(b.code.toLowerCase(), '+55 11 98765-4321')).toMatchObject({ code: b.code });
    expect(await api.find(b.code, '11900000000')).toBeNull();
    const cancelled = await api.cancel(b.code, '11987654321');
    expect(cancelled.status).toBe('cancelled');
    expect((await api.getBusy('2026-11-03')).rafael).toBeUndefined();
  });

  it('refuses online cancellation too close to the appointment', async () => {
    const api = createLocalApi(memoryStorage(), { latencyMs: 0, now: () => shopInstant('2026-11-03', '08:00') });
    const b = await api.create({ ...base, proId: 'rafael', idempotencyKey: 'k1' });
    const later = createLocalApi(
      { getItem: () => JSON.stringify({ bookings: [b], idempotency: {} }), setItem: () => {} },
      { latencyMs: 0, now: () => shopInstant('2026-11-03', '09:00') },
    );
    await expect(later.cancel(b.code, '11987654321')).rejects.toMatchObject({ code: 'too_late' });
  });
});

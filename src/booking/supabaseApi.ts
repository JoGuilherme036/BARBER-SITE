import { normalizeBrPhone } from '@/lib/phone';
import { BookingError, type Booking, type BookingApi } from './types';

// LIVE adapter: talks to the Postgres functions in supabase/migrations through PostgREST.
// Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. The anon role can only call these
// RPCs; tables are protected by RLS.

type Row = {
  code: string;
  status: Booking['status'];
  local_day: string;
  local_time: string;
  starts_at: string;
  ends_at: string;
  professional_id: string;
  service_ids: string[];
  duration_min: number;
  total_cents: number;
  customer_name: string;
  customer_phone: string;
  created_at: string;
};

const toBooking = (r: Row): Booking => ({
  code: r.code,
  status: r.status,
  day: r.local_day,
  time: r.local_time.slice(0, 5),
  start: r.starts_at,
  end: r.ends_at,
  proId: r.professional_id,
  serviceIds: r.service_ids,
  durationMin: r.duration_min,
  totalCents: r.total_cents,
  customer: { name: r.customer_name, phone: r.customer_phone },
  createdAt: r.created_at,
});

export function createSupabaseApi(url: string, anonKey: string): BookingApi {
  async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new BookingError('network');
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      const known = ['slot_taken', 'invalid', 'not_found', 'too_late'] as const;
      throw new BookingError(known.find((k) => err.message?.includes(k)) ?? 'invalid', err.message);
    }
    return (await res.json()) as T;
  }

  return {
    mode: 'live',
    async getBusy(day) {
      const rows = await rpc<{ professional_id: string; starts_at: string; ends_at: string }[]>('get_busy', { p_day: day });
      const map: Record<string, { start: number; end: number }[]> = {};
      for (const r of rows) (map[r.professional_id] ??= []).push({ start: Date.parse(r.starts_at), end: Date.parse(r.ends_at) });
      return map;
    },
    async create(req) {
      const row = await rpc<Row>('create_booking', {
        p_idempotency_key: req.idempotencyKey,
        p_professional_id: req.proId === 'any' ? null : req.proId,
        p_service_ids: req.serviceIds,
        p_day: req.day,
        p_time: req.time,
        p_name: req.customer.name.trim(),
        p_phone: normalizeBrPhone(req.customer.phone),
        p_email: req.customer.email || null,
        p_notes: req.customer.notes || null,
      });
      return toBooking(row);
    },
    async find(code, phone) {
      const rows = await rpc<Row[]>('find_booking', { p_code: code.trim().toUpperCase(), p_phone: normalizeBrPhone(phone) });
      return rows[0] ? toBooking(rows[0]) : null;
    },
    async cancel(code, phone) {
      return toBooking(await rpc<Row>('cancel_booking', { p_code: code.trim().toUpperCase(), p_phone: normalizeBrPhone(phone) }));
    },
  };
}

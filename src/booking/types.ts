export type BookingStatus = 'confirmed' | 'cancelled';

export type Booking = {
  code: string;
  status: BookingStatus;
  day: string; // YYYY-MM-DD, shop local
  time: string; // HH:mm, shop local
  start: string; // ISO instant
  end: string; // ISO instant
  proId: string;
  serviceIds: string[];
  durationMin: number;
  totalCents: number;
  customer: { name: string; phone: string; email?: string; notes?: string };
  createdAt: string;
};

export type CreateBookingRequest = {
  idempotencyKey: string;
  serviceIds: string[];
  proId: string | 'any';
  day: string;
  time: string;
  customer: { name: string; phone: string; email?: string; notes?: string };
};

export type BookingErrorCode = 'slot_taken' | 'invalid' | 'not_found' | 'too_late' | 'network';

export class BookingError extends Error {
  constructor(public code: BookingErrorCode, message?: string) {
    super(message ?? code);
  }
}

export interface BookingApi {
  mode: 'demo' | 'live';
  /** Busy intervals per professional for one day. Never returns customer data. */
  getBusy(day: string): Promise<Record<string, { start: number; end: number }[]>>;
  create(req: CreateBookingRequest): Promise<Booking>;
  find(code: string, phone: string): Promise<Booking | null>;
  cancel(code: string, phone: string): Promise<Booking>;
}

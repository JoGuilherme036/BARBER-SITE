import { createLocalApi } from './localApi';
import { createSupabaseApi } from './supabaseApi';
import type { BookingApi } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const memory = new Map<string, string>();
const safeStorage = {
  getItem: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
};

export const bookingApi: BookingApi = url && key ? createSupabaseApi(url, key) : createLocalApi(safeStorage);

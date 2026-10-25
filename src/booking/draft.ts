import { useEffect, useState } from 'react';

// Booking draft kept in sessionStorage so a refresh, the 3D detour or the back button
// never loses what the visitor already chose. No sensitive data beyond the form fields.

export type Draft = {
  serviceIds: string[];
  proId: string | 'any' | null;
  day: string | null;
  time: string | null;
  name: string;
  phone: string;
  email: string;
  notes: string;
  idempotencyKey: string;
};

const KEY = 'rb.booking.draft.v1';

export const emptyDraft = (): Draft => ({
  serviceIds: [],
  proId: null,
  day: null,
  time: null,
  name: '',
  phone: '',
  email: '',
  notes: '',
  idempotencyKey: crypto.randomUUID?.() ?? String(Math.random()).slice(2),
});

function load(): Draft {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return { ...emptyDraft(), ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    /* storage unavailable */
  }
  return emptyDraft();
}

export function useDraft() {
  const [draft, setDraft] = useState<Draft>(load);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable */
    }
  }, [draft]);
  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const reset = () => setDraft(emptyDraft());
  return { draft, update, reset };
}

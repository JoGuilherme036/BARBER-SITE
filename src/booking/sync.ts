import { useEffect, useState } from 'react';
import { bookingApi } from './api';
import { LOCAL_STORE_KEY } from './localApi';

// Keeps every open screen in step with the schedule. Other devices: a cheap version number is
// polled while the screen is visible (and on focus/reconnect). Other tabs on this device: an
// instant BroadcastChannel ping. Any change bumps the returned counter so callers refetch.

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('rb-schedule') : null;
const local = new Set<() => void>();

/** Call after this screen changed the schedule (booking, block, status). */
export function notifyScheduleChanged() {
  channel?.postMessage('changed');
  local.forEach((fn) => fn());
}

export function useScheduleVersion(intervalMs = 10_000, active = true) {
  const [tick, setTick] = useState(0);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    let last: number | null = null;
    const bump = () => alive && setTick((t) => t + 1);

    const check = async () => {
      if (document.hidden) return;
      try {
        const v = await bookingApi.version();
        if (!alive) return;
        setSyncedAt(Date.now());
        if (last !== null && v !== last) bump();
        last = v;
      } catch {
        /* offline: try again on the next tick */
      }
    };

    check();
    const id = setInterval(check, intervalMs);
    const onWake = () => !document.hidden && check();
    const onStorage = (e: StorageEvent) => e.key === LOCAL_STORE_KEY && bump();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);
    window.addEventListener('storage', onStorage);
    channel?.addEventListener('message', bump);
    local.add(bump);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
      window.removeEventListener('storage', onStorage);
      channel?.removeEventListener('message', bump);
      local.delete(bump);
    };
  }, [intervalMs, active]);

  return { tick, syncedAt };
}

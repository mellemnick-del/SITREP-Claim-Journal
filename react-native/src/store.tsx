import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as db from './db';
import { addDays, dayKey, lastDays, today } from './dates';

type Data = ReturnType<typeof db.loadAll>;
type Store = Data & {
  isExample: boolean;
  onboarded: boolean;
  /** Run a database write, then reload everything so every screen stays in sync. */
  write: (fn: () => void) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => {
    db.migrate();
    return { data: db.loadAll(), isExample: db.getMeta('example') === '1', onboarded: db.getMeta('onboarded') === '1' };
  });

  const write = useCallback((fn: () => void) => {
    fn();
    setState({ data: db.loadAll(), isExample: db.getMeta('example') === '1', onboarded: db.getMeta('onboarded') === '1' });
  }, []);

  const value = useMemo(
    () => ({ ...state.data, isExample: state.isExample, onboarded: state.onboarded, write }),
    [state, write],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

// ---- derived stats ----
export const WINDOW = 30;

export function windowStart() {
  return addDays(today(), -(WINDOW - 1)).getTime();
}

export function daysLogged(s: Data) {
  return lastDays(WINDOW).filter(d => s.checkins[dayKey(d)]).length;
}

export function streak(s: Data) {
  let d = s.checkins[dayKey(today())] ? today() : addDays(today(), -1);
  let n = 0;
  while (s.checkins[dayKey(d)]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function conditionStats(s: Data, id: number) {
  const vals = lastDays(WINDOW)
    .map(d => s.checkins[dayKey(d)]?.severity[id])
    .filter((v): v is number => typeof v === 'number');
  const fl = s.flares.filter(f => f.conditionId === id && f.start >= windowStart());
  const limitedDays = lastDays(WINDOW).filter(d => {
    const c = s.checkins[dayKey(d)];
    return c && c.limited && (c.severity[id] ?? 0) >= 6;
  }).length;
  return {
    avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
    peak: vals.length ? Math.max(...vals) : 0,
    logged: vals.length,
    flares: fl.length,
    avgHours: fl.length ? fl.reduce((a, f) => a + f.hours, 0) / fl.length : 0,
    liedDown: fl.filter(f => f.liedDown).length,
    limitedDays,
  };
}

const TIPS: Record<string, string> = {
  '6260': 'Note when the ringing makes it hard to sleep, focus or follow a conversation. Examiners ask how it affects daily life.',
  '5237': "Log flare-ups with how long they last and what you couldn't do, like bending, lifting or sitting through a shift.",
  '8100': 'For each attack, note whether you had to stop and lie down. How often that happens is a key question for migraines.',
  '5260': 'Track stairs, kneeling and instability. Note any days you used a brace or cane.',
  '9411': 'Note sleep, nightmares, irritability, and days you avoided people or places. Include how it affected work and family.',
  '6847': 'Track CPAP use, daytime sleepiness, and any days you nodded off at work or behind the wheel.',
};
export const tipFor = (dc: string) =>
  TIPS[dc.trim()] ??
  'Log how it affects work, sleep and daily tasks, and note flare-ups with how long they lasted. Specific examples help more than numbers alone.';

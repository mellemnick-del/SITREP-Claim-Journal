export const DAY = 86_400_000;
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MO_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Local calendar day as YYYY-MM-DD, used as the check-in key. */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromDayKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const today = () => startOfDay(new Date());

/** Last n calendar days ending today, oldest first. */
export function lastDays(n: number): Date[] {
  const t = today();
  return Array.from({ length: n }, (_, i) => addDays(t, i - (n - 1)));
}

export const daysUntil = (d: Date) => Math.round((startOfDay(d).getTime() - today().getTime()) / DAY);

/** Military date-time group in local time (zone letter J), e.g. 161430JOCT26. */
export const dtg = (d: Date) =>
  `${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}J${MON[d.getMonth()]}${String(d.getFullYear()).slice(2)}`;

export const fmtShort = (d: Date) => `${WD[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}`;
export const fmtMonthDay = (d: Date) => `${MO[d.getMonth()]} ${d.getDate()}`;
export const fmtFull = (d: Date) => `${MO[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
export const fmtLong = (d: Date) => `${WD_LONG[d.getDay()]}, ${MO_LONG[d.getMonth()]} ${d.getDate()}`;
export const hhmm = (d: Date) => `${pad(d.getHours())}${pad(d.getMinutes())}`;

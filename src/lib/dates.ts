// Dates are stored as local 'YYYY-MM-DD' strings, months as 'YYYY-MM'.
// Both sort correctly as plain strings, which keeps IndexedDB range queries simple.

const MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];
const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

const pad = (n: number) => String(n).padStart(2, '0');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISODate(new Date());
export const currentMonth = () => todayISO().slice(0, 7);

export function addDays(iso: string, n: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthBounds(ym: string): [string, string] {
  return [`${ym}-01`, `${ym}-31`];
}

/** 'Октябрь', or 'Октябрь 2025' outside the current year. */
export function monthTitle(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const name = cap(MONTHS[m - 1]);
  return y === new Date().getFullYear() ? name : `${name} ${y}`;
}

/** Lowercase month for phrases like «за октябрь». */
export function monthName(ym: string): string {
  return MONTHS[Number(ym.slice(5, 7)) - 1];
}

function dayMonth(d: Date): string {
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${year}`;
}

/** 'Сегодня', 'Вчера' or 'Суббота, 24 октября'. */
export function dayTitle(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Сегодня';
  if (iso === addDays(today, -1)) return 'Вчера';
  const d = fromISODate(iso);
  return `${cap(WEEKDAYS[d.getDay()])}, ${dayMonth(d)}`;
}

/** 'Сегодня', 'Вчера' or '24 октября'. */
export function shortDate(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Сегодня';
  if (iso === addDays(today, -1)) return 'Вчера';
  return dayMonth(fromISODate(iso));
}

export function daysSince(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / 86_400_000);
}

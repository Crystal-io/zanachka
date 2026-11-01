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
const MONTHS_PREP = [
  'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре',
];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WEEKDAYS_PLURAL = [
  'по воскресеньям', 'по понедельникам', 'по вторникам', 'по средам',
  'по четвергам', 'по пятницам', 'по субботам',
];

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

export function daysBetween(from: string, to: string): number {
  return Math.round((fromISODate(to).getTime() - fromISODate(from).getTime()) / 86_400_000);
}

/** Adds months keeping the day, clamped to the month's length: Jan 31 + 1 → Feb 28. */
export function addMonthsClamped(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return toISODate(new Date(target.getFullYear(), target.getMonth(), Math.min(d, lastDay)));
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

/** Prepositional month for phrases like «в ноябре». */
export function monthPrepositional(ym: string): string {
  return MONTHS_PREP[Number(ym.slice(5, 7)) - 1];
}

/** Genitive month for phrases like «к концу апреля», with the year outside the current one. */
export function monthGenitive(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const name = MONTHS_GEN[m - 1];
  return y === new Date().getFullYear() ? name : `${name} ${y}`;
}

/** Compact month for tables: 'Ноя', or 'Янв ’27' outside the current year. */
export function monthShortTitle(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const name = cap(MONTHS_SHORT[m - 1]);
  return y === new Date().getFullYear() ? name : `${name} ’${String(y).slice(2)}`;
}

/** 'по пятницам' for the weekday of the date. */
export function weekdayPlural(iso: string): string {
  return WEEKDAYS_PLURAL[fromISODate(iso).getDay()];
}

/** '12 марта' — day and month only, no year. */
export function dayAndMonth(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
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

/** 'Сегодня', 'Вчера', 'Завтра' or '24 октября'. */
export function shortDate(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Сегодня';
  if (iso === addDays(today, -1)) return 'Вчера';
  if (iso === addDays(today, 1)) return 'Завтра';
  return dayMonth(fromISODate(iso));
}

export function daysSince(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / 86_400_000);
}

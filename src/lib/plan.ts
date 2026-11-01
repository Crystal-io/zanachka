import type { Period, Recurring } from '../db';
import {
  addDays,
  addMonthsClamped,
  daysBetween,
  dayAndMonth,
  monthBounds,
  shiftMonth,
  shortDate,
  todayISO,
  weekdayPlural,
} from './dates';

export const PERIODS: Record<Period, { label: string; perMonth: number }> = {
  week: { label: 'Неделя', perMonth: 52 / 12 },
  month: { label: 'Месяц', perMonth: 1 },
  quarter: { label: 'Квартал', perMonth: 1 / 3 },
  year: { label: 'Год', perMonth: 1 / 12 },
};

export const PERIOD_ORDER: Period[] = ['week', 'month', 'quarter', 'year'];

const MONTH_STEP = { month: 1, quarter: 3, year: 12 } as const;

/** How early a recorded payment still counts towards the next due date. */
const EARLY_DAYS: Record<Period, number> = { week: 3, month: 15, quarter: 45, year: 182 };

type Schedule = Pick<Recurring, 'period' | 'startDate'>;

/** Average cost per month, in cents: a 480 € yearly payment is 40 € a month. */
export function perMonth(r: Pick<Recurring, 'amount' | 'period'>): number {
  return Math.round(r.amount * PERIODS[r.period].perMonth);
}

/** Payment dates between `from` and `to` (inclusive). Nothing falls before the start date. */
export function occurrences(r: Schedule, from: string, to: string): string[] {
  const dates: string[] = [];
  if (r.period === 'week') {
    let d = r.startDate;
    if (d < from) d = addDays(d, Math.ceil(daysBetween(d, from) / 7) * 7);
    for (; d <= to; d = addDays(d, 7)) dates.push(d);
    return dates;
  }
  const step = MONTH_STEP[r.period];
  for (let n = 0; ; n += step) {
    const d = addMonthsClamped(r.startDate, n);
    if (d > to) break;
    if (d >= from) dates.push(d);
  }
  return dates;
}

export function upcoming(r: Schedule, count: number, today = todayISO()): string[] {
  return occurrences(r, today, addDays(today, 800)).slice(0, count);
}

/**
 * Date of the operation that already pays the next due date, if any: rent
 * recorded on the 3rd covers the 5th. A payment after the due date belongs to
 * that past date, so it doesn't count for the next one.
 */
export function paidOn(r: Recurring, linkedDates: string[] | undefined, today = todayISO()): string | null {
  if (!linkedDates?.length) return null;
  const next = upcoming(r, 1, today)[0];
  if (!next) return null;
  const windowStart = addDays(next, -EARLY_DAYS[r.period]);
  const hits = linkedDates.filter((d) => d >= windowStart && d <= today).sort();
  return hits.at(-1) ?? null;
}

/** Link to a new operation prefilled from the regular payment. */
export function recordUrl(r: Recurring): string {
  const params = new URLSearchParams({ type: r.kind, amount: String(r.amount), note: r.name, recurring: String(r.id) });
  if (r.categoryId != null) params.set('category', String(r.categoryId));
  return `/add?${params}`;
}

/** 'Каждый месяц, 5-го', 'Раз в год, 12 марта', 'Раз в квартал · ближайший 5 декабря'. */
export function describeSchedule(r: Schedule): string {
  switch (r.period) {
    case 'week':
      return `Каждую неделю, ${weekdayPlural(r.startDate)}`;
    case 'month':
      return `Каждый месяц, ${Number(r.startDate.slice(8))}-го`;
    case 'quarter': {
      const next = upcoming(r, 1)[0];
      return next ? `Раз в квартал · ближайший ${shortDate(next).toLowerCase()}` : 'Раз в квартал';
    }
    case 'year':
      return `Раз в год, ${dayAndMonth(r.startDate)}`;
  }
}

export interface ForecastRow {
  /** 'YYYY-MM' */
  month: string;
  income: number;
  expense: number;
  /** Projected total on accounts at the end of the month. */
  balance: number;
}

/**
 * Month-by-month projection from today's balance. In the current month only
 * payments from today on are counted: earlier ones are already in the balance,
 * and so is a next payment that was recorded ahead of its date.
 */
export function forecast(
  items: Recurring[],
  startBalance: number,
  linked?: Map<number, string[]>,
  months = 12,
  today = todayISO(),
): ForecastRow[] {
  const active = items.filter((r) => r.active);
  const alreadyPaid = new Map(
    active.filter((r) => paidOn(r, linked?.get(r.id), today)).map((r) => [r.id, upcoming(r, 1, today)[0]]),
  );
  const rows: ForecastRow[] = [];
  let balance = startBalance;
  for (let i = 0; i < months; i++) {
    const month = shiftMonth(today.slice(0, 7), i);
    const [monthStart, monthEnd] = monthBounds(month);
    const from = i === 0 ? today : monthStart;
    let income = 0;
    let expense = 0;
    for (const r of active) {
      const dates = occurrences(r, from, monthEnd).filter((d) => d !== alreadyPaid.get(r.id));
      const total = dates.length * r.amount;
      if (r.kind === 'income') income += total;
      else expense += total;
    }
    balance += income - expense;
    rows.push({ month, income, expense, balance });
  }
  return rows;
}

/** Regular income and expenses per month on average, and what is left. */
export function monthlyTotals(items: Recurring[]) {
  let income = 0;
  let expense = 0;
  for (const r of items) {
    if (!r.active) continue;
    if (r.kind === 'income') income += perMonth(r);
    else expense += perMonth(r);
  }
  return { income, expense, free: income - expense };
}

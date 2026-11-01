import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeBalances, db, type Account, type Category, type Recurring, type Transaction } from './db';
import { currentMonth, monthBounds, shiftMonth } from './lib/dates';

const byOrder = <T extends { order: number; id: number }>(a: T, b: T) => a.order - b.order || a.id - b.id;

export function useAccounts(): Account[] | undefined {
  return useLiveQuery(async () => (await db.accounts.toArray()).sort(byOrder), []);
}

export function useCategories(): Category[] | undefined {
  return useLiveQuery(async () => (await db.categories.toArray()).sort(byOrder), []);
}

export function useBalances(): Map<number, number> | undefined {
  return useLiveQuery(async () => {
    const [accounts, txs] = await Promise.all([db.accounts.toArray(), db.transactions.toArray()]);
    return computeBalances(accounts, txs);
  }, []);
}

export function useMonthTransactions(month: string): Transaction[] | undefined {
  return useLiveQuery(() => {
    const [from, to] = monthBounds(month);
    return db.transactions.where('date').between(from, to, true, true).toArray();
  }, [month]);
}

export function useRecurring(): Recurring[] | undefined {
  return useLiveQuery(() => db.recurring.toArray(), []);
}

/** Dates of operations recorded from each regular payment, by its id. */
export function useLinkedPayments(): Map<number, string[]> | undefined {
  return useLiveQuery(async () => {
    const linked = new Map<number, string[]>();
    for (const t of await db.transactions.where('recurringId').aboveOrEqual(0).toArray()) {
      if (t.recurringId != null) linked.set(t.recurringId, [...(linked.get(t.recurringId) ?? []), t.date]);
    }
    return linked;
  }, []);
}

/** Total on active accounts that count towards the overall balance. */
export function useTotalBalance(): number | undefined {
  const accounts = useAccounts();
  const balances = useBalances();
  return useMemo(() => {
    if (!accounts || !balances) return undefined;
    return accounts
      .filter((a) => !a.archived && a.includeInTotal)
      .reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);
  }, [accounts, balances]);
}

/**
 * What was actually kept per month (income − expenses) over the last complete
 * months that have any records. `null` when there is no history yet.
 */
export function useActualSavings(months = 3): { average: number; months: number } | null | undefined {
  return useLiveQuery(async () => {
    const thisMonth = currentMonth();
    const from = `${shiftMonth(thisMonth, -months)}-01`;
    const to = monthBounds(shiftMonth(thisMonth, -1))[1];
    const txs = await db.transactions.where('date').between(from, to, true, true).toArray();
    const net = new Map<string, number>();
    for (const t of txs) {
      if (t.type === 'transfer') continue;
      const month = t.date.slice(0, 7);
      net.set(month, (net.get(month) ?? 0) + (t.type === 'income' ? t.amount : -t.amount));
    }
    if (net.size === 0) return null;
    const total = [...net.values()].reduce((a, b) => a + b, 0);
    return { average: Math.round(total / net.size), months: net.size };
  }, [months]);
}

/** Meta value, `null` when it was never set, `undefined` while loading. */
export function useMeta<T>(key: string): T | null | undefined {
  return useLiveQuery(async () => ((await db.meta.get(key))?.value as T | undefined) ?? null, [key]);
}

export function useById<T extends { id: number }>(items: T[] | undefined): Map<number, T> {
  return useMemo(() => new Map((items ?? []).map((item) => [item.id, item])), [items]);
}

/**
 * Goes back in history, or to `fallback` when the screen was opened directly
 * (e.g. from the home-screen shortcut) and there is nothing to go back to.
 */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}

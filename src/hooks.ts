import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeBalances, db, type Account, type Category, type Transaction } from './db';
import { monthBounds } from './lib/dates';

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

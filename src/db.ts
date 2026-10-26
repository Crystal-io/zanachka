import Dexie, { type EntityTable } from 'dexie';
import type { AccountType } from './lib/palette';

export type TxType = 'expense' | 'income' | 'transfer';
export type CategoryKind = 'expense' | 'income';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  /** Balance before the first recorded transaction, in cents. */
  initialBalance: number;
  includeInTotal: boolean;
  archived: boolean;
  order: number;
  createdAt: number;
}

export interface Category {
  id: number;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  order: number;
  archived: boolean;
}

export interface Transaction {
  id: number;
  type: TxType;
  /** Always positive, in cents. The type decides the direction. */
  amount: number;
  accountId: number;
  /** Destination account for transfers. */
  toAccountId?: number;
  /** Not set for transfers. */
  categoryId?: number;
  /** Local date 'YYYY-MM-DD'. */
  date: string;
  note: string;
  createdAt: number;
}

export interface Meta {
  key: string;
  value: unknown;
}

// The database keeps its original name: renaming it would leave existing data behind.
export const db = new Dexie('my-finance') as Dexie & {
  accounts: EntityTable<Account, 'id'>;
  categories: EntityTable<Category, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
  meta: EntityTable<Meta, 'key'>;
};

db.version(1).stores({
  accounts: '++id',
  categories: '++id, kind',
  transactions: '++id, date, accountId, toAccountId, categoryId',
  meta: 'key',
});

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'order' | 'archived'>[] = [
  { kind: 'expense', name: 'Продукты', icon: 'shopping-cart', color: '#2F8F5B' },
  { kind: 'expense', name: 'Кафе и рестораны', icon: 'utensils', color: '#D98A2B' },
  { kind: 'expense', name: 'Транспорт', icon: 'bus', color: '#3C6FC4' },
  { kind: 'expense', name: 'Жильё', icon: 'house', color: '#8A5BB8' },
  { kind: 'expense', name: 'Коммунальные услуги', icon: 'zap', color: '#C9A227' },
  { kind: 'expense', name: 'Связь и подписки', icon: 'wifi', color: '#1F8A8A' },
  { kind: 'expense', name: 'Здоровье', icon: 'heart-pulse', color: '#C43C5C' },
  { kind: 'expense', name: 'Одежда', icon: 'shirt', color: '#B8487A' },
  { kind: 'expense', name: 'Развлечения', icon: 'ticket', color: '#5464B0' },
  { kind: 'expense', name: 'Подарки', icon: 'gift', color: '#C9543F' },
  { kind: 'expense', name: 'Путешествия', icon: 'plane', color: '#2A8FB8' },
  { kind: 'expense', name: 'Прочее', icon: 'ellipsis', color: '#6B7680' },
  { kind: 'income', name: 'Зарплата', icon: 'briefcase', color: '#2F8F5B' },
  { kind: 'income', name: 'Подработка', icon: 'laptop', color: '#3C6FC4' },
  { kind: 'income', name: 'Проценты', icon: 'trending-up', color: '#C9A227' },
  { kind: 'income', name: 'Кэшбэк и возвраты', icon: 'rotate-ccw', color: '#D98A2B' },
  { kind: 'income', name: 'Подарки', icon: 'gift', color: '#B8487A' },
  { kind: 'income', name: 'Прочее', icon: 'ellipsis', color: '#6B7680' },
];

db.on('populate', (tx) => {
  tx.table('categories').bulkAdd(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, order: i, archived: false })));
});

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export function setMeta(key: string, value: unknown) {
  return db.meta.put({ key, value });
}

/** Current balance of every account, in cents. */
export function computeBalances(accounts: Account[], txs: Transaction[]): Map<number, number> {
  const balances = new Map(accounts.map((a) => [a.id, a.initialBalance]));
  const add = (id: number | undefined, delta: number) => {
    if (id != null) balances.set(id, (balances.get(id) ?? 0) + delta);
  };
  for (const t of txs) {
    if (t.type === 'income') add(t.accountId, t.amount);
    else if (t.type === 'expense') add(t.accountId, -t.amount);
    else {
      add(t.accountId, -t.amount);
      add(t.toAccountId, t.amount);
    }
  }
  return balances;
}

/** Newest first: by date, then by when it was entered. */
export function byNewest(a: Transaction, b: Transaction): number {
  return a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1;
}

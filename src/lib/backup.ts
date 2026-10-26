import { db, setMeta, type Account, type Category, type Transaction } from '../db';
import { todayISO } from './dates';

// Internal id from before the app was named «Заначка»; changing it would reject existing backups.
const APP_ID = 'my-finance';

export interface Backup {
  app: typeof APP_ID;
  version: 1;
  exportedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
}

/** Saves all data as a JSON file to the phone's Downloads folder. */
export async function downloadBackup(): Promise<void> {
  const [accounts, categories, transactions] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
  ]);
  const backup: Backup = {
    app: APP_ID,
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions,
  };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `zanachka-backup-${todayISO()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  await setMeta('lastBackupAt', Date.now());
}

export async function readBackup(file: File): Promise<Backup> {
  let data: Partial<Backup>;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Файл не читается: это не резервная копия.');
  }
  const valid =
    data?.app === APP_ID &&
    Array.isArray(data.accounts) &&
    Array.isArray(data.categories) &&
    Array.isArray(data.transactions);
  if (!valid) throw new Error('Это не резервная копия «Заначки».');
  return data as Backup;
}

/** Replaces everything on the phone with the backup's contents. */
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', db.accounts, db.categories, db.transactions, async () => {
    await Promise.all([db.accounts.clear(), db.categories.clear(), db.transactions.clear()]);
    await db.accounts.bulkAdd(backup.accounts);
    await db.categories.bulkAdd(backup.categories);
    await db.transactions.bulkAdd(backup.transactions);
  });
}

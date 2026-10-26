import type { Account, Category, Transaction } from '../db';
import { formatMoney } from '../lib/format';
import { CatIcon } from './ui';

export function TxRow({
  tx,
  category,
  account,
  toAccount,
  onClick,
}: {
  tx: Transaction;
  category?: Category;
  account?: Account;
  toAccount?: Account;
  onClick: () => void;
}) {
  const isTransfer = tx.type === 'transfer';
  const title = isTransfer ? 'Перевод' : (category?.name ?? 'Без категории');
  const where = isTransfer ? `${account?.name ?? '—'} → ${toAccount?.name ?? '—'}` : (account?.name ?? '—');
  const amount =
    tx.type === 'income'
      ? formatMoney(tx.amount, { sign: true })
      : tx.type === 'expense'
        ? formatMoney(-tx.amount)
        : formatMoney(tx.amount);

  return (
    <button type="button" className="tx" onClick={onClick}>
      <CatIcon icon={isTransfer ? 'transfer' : category?.icon} color={isTransfer ? '#6B7680' : (category?.color ?? '#6B7680')} />
      <span className="tx__main">
        <span className="tx__title">{title}</span>
        <span className="tx__sub">{tx.note ? `${where} · ${tx.note}` : where}</span>
      </span>
      <span className={`tx__amount tx__amount--${tx.type}`}>{amount}</span>
    </button>
  );
}

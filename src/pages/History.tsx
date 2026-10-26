import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TxRow } from '../components/TxRow';
import { MonthSwitcher, Segmented } from '../components/ui';
import { byNewest, type Transaction, type TxType } from '../db';
import { useAccounts, useById, useCategories, useMonthTransactions } from '../hooks';
import { currentMonth, dayTitle } from '../lib/dates';
import { formatMoney } from '../lib/format';

type Filter = 'all' | TxType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
  { value: 'transfer', label: 'Переводы' },
];

export default function History() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const month = params.get('m') ?? currentMonth();
  const filter = (params.get('type') as Filter | null) ?? 'all';
  const accountFilter = params.get('account') ? Number(params.get('account')) : null;
  const [query, setQuery] = useState('');

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const accounts = useAccounts();
  const categories = useCategories();
  const monthTx = useMonthTransactions(month);
  const accountById = useById(accounts);
  const categoryById = useById(categories);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (monthTx ?? [])
      .filter((t) => filter === 'all' || t.type === filter)
      .filter((t) => accountFilter === null || t.accountId === accountFilter || t.toAccountId === accountFilter)
      .filter((t) => {
        if (!q) return true;
        const category = t.categoryId != null ? categoryById.get(t.categoryId)?.name : 'перевод';
        const text = [t.note, category, accountById.get(t.accountId)?.name].join(' ').toLowerCase();
        return text.includes(q);
      })
      .sort(byNewest);
  }, [monthTx, filter, accountFilter, query, accountById, categoryById]);

  const days = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const t of filtered) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);
    return [...groups];
  }, [filtered]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') expense += t.amount;
    }
    return { income, expense };
  }, [filtered]);

  if (!monthTx) return null;
  const filterAccount = accountFilter !== null ? accountById.get(accountFilter) : undefined;

  return (
    <>
      <MonthSwitcher month={month} onChange={(m) => setParam('m', m === currentMonth() ? null : m)} />

      <div className="history-tools">
        <Segmented
          label="Тип операций"
          options={FILTERS}
          value={filter}
          onChange={(v) => setParam('type', v === 'all' ? null : v)}
        />
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Поиск по заметке или категории"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
          />
        </label>
        {filterAccount && (
          <button type="button" className="filter-chip" onClick={() => setParam('account', null)}>
            Счёт: {filterAccount.name}
            <X size={16} />
          </button>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="history-totals mono">
          <span className="is-income">{formatMoney(totals.income, { sign: true })}</span>
          <span>{formatMoney(-totals.expense)}</span>
        </p>
      )}

      {days.length === 0 ? (
        <div className="empty">
          <p>
            {monthTx.length === 0
              ? 'В этом месяце операций нет.'
              : 'Ничего не нашлось. Попробуйте другой фильтр или запрос.'}
          </p>
          {monthTx.length === 0 && (
            <Link to="/add?type=expense" className="btn btn--ghost">
              Записать операцию
            </Link>
          )}
        </div>
      ) : (
        days.map(([date, txs]) => {
          const spent = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          return (
            <section key={date} className="day">
              <h2 className="day__head">
                <span>{dayTitle(date)}</span>
                {spent > 0 && <span className="mono">{formatMoney(-spent)}</span>}
              </h2>
              <div className="tx-list">
                {txs.map((t) => (
                  <TxRow
                    key={t.id}
                    tx={t}
                    category={t.categoryId != null ? categoryById.get(t.categoryId) : undefined}
                    account={accountById.get(t.accountId)}
                    toAccount={t.toAccountId != null ? accountById.get(t.toAccountId) : undefined}
                    onClick={() => navigate(`/tx/${t.id}`)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}

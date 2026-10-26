import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, ShieldAlert } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AccountNote } from '../components/AccountNote';
import { TxRow } from '../components/TxRow';
import { CatIcon, MonthSwitcher, Section } from '../components/ui';
import { byNewest, db } from '../db';
import { useAccounts, useBalances, useById, useCategories, useMeta, useMonthTransactions } from '../hooks';
import { downloadBackup } from '../lib/backup';
import { currentMonth, daysSince, monthName } from '../lib/dates';
import { formatMoney, formatPercent, moneyParts, plural } from '../lib/format';
import { useToast } from '../components/Feedback';

const BACKUP_REMIND_DAYS = 7;
const TOP_CATEGORIES = 5;

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const month = params.get('m') ?? currentMonth();
  const setMonth = (m: string) => setParams(m === currentMonth() ? {} : { m }, { replace: true });

  const accounts = useAccounts();
  const categories = useCategories();
  const balances = useBalances();
  const monthTx = useMonthTransactions(month);
  const recent = useLiveQuery(
    async () => (await db.transactions.orderBy('date').reverse().limit(40).toArray()).sort(byNewest).slice(0, 5),
    [],
  );
  const txCount = useLiveQuery(() => db.transactions.count(), []);
  const lastBackupAt = useMeta<number>('lastBackupAt');
  const accountById = useById(accounts);
  const categoryById = useById(categories);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byCategory = new Map<number, number>();
    for (const t of monthTx ?? []) {
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') {
        expense += t.amount;
        if (t.categoryId != null) byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amount);
      }
    }
    const topCategories = [...byCategory].sort((a, b) => b[1] - a[1]);
    return { income, expense, topCategories };
  }, [monthTx]);

  if (!accounts || !balances || !monthTx || !recent) return null;

  const saved = stats.income - stats.expense;
  const rate = stats.income > 0 ? saved / stats.income : null;
  const savedParts = moneyParts(saved);
  const activeAccounts = accounts.filter((a) => !a.archived);
  const total = activeAccounts
    .filter((a) => a.includeInTotal)
    .reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);

  const backupAge = lastBackupAt ? daysSince(lastBackupAt) : null;
  const needsBackup = (txCount ?? 0) > 0 && (backupAge === null || backupAge >= BACKUP_REMIND_DAYS);
  const maxCategory = stats.topCategories[0]?.[1] ?? 0;
  const shownCategories = showAllCategories ? stats.topCategories : stats.topCategories.slice(0, TOP_CATEGORIES);

  return (
    <>
      <MonthSwitcher month={month} onChange={setMonth} />

      <section className="hero" aria-label="Итоги месяца">
        <p className="eyebrow">
          {saved < 0 ? 'Перерасход' : 'Сбережения'} за {monthName(month)}
        </p>
        <p className={`hero__value${saved > 0 ? ' is-save' : saved < 0 ? ' is-over' : ''}`}>
          {saved > 0 ? '+' : savedParts.negative ? '−' : ''}
          {savedParts.int}
          <small>,{savedParts.frac}&nbsp;€</small>
        </p>
        {rate !== null && (
          <p className="hero__rate">
            {rate >= 0 ? `${formatPercent(rate)} дохода отложено` : 'Расходы превысили доходы'}
          </p>
        )}
        <SplitBar income={stats.income} expense={stats.expense} />
        <dl className="hero__stats">
          <div>
            <dt>
              <i className="dot dot--income" /> Доходы
            </dt>
            <dd>{formatMoney(stats.income)}</dd>
          </div>
          <div>
            <dt>
              <i className="dot dot--expense" /> Расходы
            </dt>
            <dd>{formatMoney(stats.expense)}</dd>
          </div>
        </dl>
        {monthTx.length === 0 && (
          <p className="hero__empty">Запишите доход или расход — здесь появится итог месяца.</p>
        )}
      </section>

      {needsBackup && (
        <div className="banner">
          <ShieldAlert size={22} strokeWidth={1.75} />
          <p className="banner__text">
            {backupAge === null
              ? 'Резервной копии ещё нет'
              : `Последняя копия — ${backupAge} ${plural(backupAge, ['день', 'дня', 'дней'])} назад`}
          </p>
          <button
            type="button"
            className="banner__action"
            onClick={async () => {
              await downloadBackup();
              toast({ message: 'Копия сохранена в «Загрузки»' });
            }}
          >
            Сохранить
          </button>
        </div>
      )}

      <Section
        title="Счета"
        aside={<span className="section__aside mono">{formatMoney(total)}</span>}
      >
        <div className="strip">
          {activeAccounts.map((a) => (
            <AccountNote
              key={a.id}
              account={a}
              balance={balances.get(a.id) ?? 0}
              compact
              onClick={() => navigate(`/accounts/${a.id}`)}
            />
          ))}
          <Link to="/accounts/new" className="note-add note-add--compact">
            <Plus size={22} />
            Новый счёт
          </Link>
        </div>
      </Section>

      {stats.topCategories.length > 0 && (
        <Section title="Куда ушли деньги">
          <ul className="bars">
            {shownCategories.map(([id, amount]) => {
              const c = categoryById.get(id);
              return (
                <li key={id} className="bar-row" style={{ '--c': c?.color ?? '#6B7680' } as CSSProperties}>
                  <CatIcon icon={c?.icon} color={c?.color ?? '#6B7680'} />
                  <div className="bar-row__main">
                    <div className="bar-row__line">
                      <span className="bar-row__name">{c?.name ?? 'Без категории'}</span>
                      <span className="mono">{formatMoney(amount)}</span>
                    </div>
                    <div className="meter">
                      <span style={{ width: `${Math.max(2, (amount / maxCategory) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="bar-row__share">{formatPercent(amount / stats.expense)}</span>
                </li>
              );
            })}
          </ul>
          {stats.topCategories.length > TOP_CATEGORIES && (
            <button type="button" className="link-btn" onClick={() => setShowAllCategories((v) => !v)}>
              {showAllCategories ? 'Свернуть' : `Все категории · ${stats.topCategories.length}`}
            </button>
          )}
        </Section>
      )}

      <Section
        title="Последние операции"
        aside={
          recent.length > 0 && (
            <Link to="/history" className="section__link">
              Вся история
            </Link>
          )
        }
      >
        {recent.length === 0 ? (
          <p className="empty">Нажмите «+» внизу, чтобы записать первую операцию.</p>
        ) : (
          <div className="tx-list">
            {recent.map((t) => (
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
        )}
      </Section>
    </>
  );
}

/** Income as a 100% bar split into what was spent and what was kept. */
function SplitBar({ income, expense }: { income: number; expense: number }) {
  if (income === 0 && expense === 0) return <div className="split" />;
  if (expense >= income) {
    return (
      <div className="split">
        <span className={income === 0 ? 'split__spent' : 'split__over'} style={{ width: '100%' }} />
      </div>
    );
  }
  const spent = (expense / income) * 100;
  return (
    <div className="split">
      {expense > 0 && <span className="split__spent" style={{ width: `${spent}%` }} />}
      <span className="split__saved" style={{ width: `${100 - spent}%` }} />
    </div>
  );
}

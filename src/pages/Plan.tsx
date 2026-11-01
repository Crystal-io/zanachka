import { CalendarClock, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CatIcon, Section, TopBar } from '../components/ui';
import type { Category, CategoryKind, Recurring } from '../db';
import { useActualSavings, useById, useCategories, useRecurring, useTotalBalance } from '../hooks';
import { currentMonth, monthGenitive, monthPrepositional, monthShortTitle } from '../lib/dates';
import { formatMoney, formatWhole, moneyParts } from '../lib/format';
import { describeSchedule, forecast, monthlyTotals, perMonth } from '../lib/plan';

/** Regular payments and income, what is left each month, and a 12-month projection. */
export default function Plan() {
  const items = useRecurring();
  const categories = useCategories();
  const categoryById = useById(categories);
  const balance = useTotalBalance();
  const actual = useActualSavings();

  const rows = useMemo(() => (items && balance !== undefined ? forecast(items, balance) : []), [items, balance]);

  if (!items || balance === undefined || !categories) return null;

  const totals = monthlyTotals(items);
  const freeParts = moneyParts(totals.free);
  const halfYear = rows[5];
  const year = rows[11];
  // Active first, then by monthly cost, so the biggest payments are on top.
  const ordered = (kind: CategoryKind) =>
    items
      .filter((r) => r.kind === kind)
      .sort((a, b) => Number(b.active) - Number(a.active) || perMonth(b) - perMonth(a));

  return (
    <div className="screen">
      <TopBar title="План" back="/" />
      <div className="screen__body plan">
        {items.length === 0 ? (
          <div className="plan-empty">
            <span className="plan-empty__icon">
              <CalendarClock size={28} strokeWidth={1.75} />
            </span>
            <h2 className="plan-empty__title">Что у вас повторяется?</h2>
            <p>
              Добавьте аренду, подписки, связь, страховку и зарплату. Можно и примерные траты — например, продукты
              на 400 € в месяц. Здесь появится, сколько остаётся после всех платежей и сколько будет на счетах через
              год.
            </p>
            <div className="btn-row">
              <Link to="/plan/new?kind=expense" className="btn btn--primary">
                Добавить расход
              </Link>
              <Link to="/plan/new?kind=income" className="btn btn--ghost">
                Добавить доход
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="hero" aria-label="Итог по регулярным платежам">
              <p className="eyebrow">{totals.free < 0 ? 'Не хватает каждый месяц' : 'Остаётся каждый месяц'}</p>
              <p className={`hero__value${totals.free > 0 ? ' is-save' : totals.free < 0 ? ' is-over' : ''}`}>
                {totals.free > 0 ? '+' : freeParts.negative ? '−' : ''}
                {freeParts.int}
                <small>,{freeParts.frac}&nbsp;€</small>
              </p>
              <p className="hero__rate">
                Регулярные доходы {formatMoney(totals.income, { whole: true })} − расходы{' '}
                {formatMoney(totals.expense, { whole: true })}
              </p>
              <dl className="hero__stats">
                <div>
                  <dt>К концу {monthGenitive(halfYear.month)}</dt>
                  <dd className={halfYear.balance < 0 ? 'is-over' : undefined}>
                    ≈&nbsp;{formatMoney(halfYear.balance, { whole: true })}
                  </dd>
                </div>
                <div>
                  <dt>К концу {monthGenitive(year.month)}</dt>
                  <dd className={year.balance < 0 ? 'is-over' : undefined}>
                    ≈&nbsp;{formatMoney(year.balance, { whole: true })}
                  </dd>
                </div>
              </dl>
              {actual && (
                <p className="plan-fact">
                  По вашим записям за {actual.months} мес. вы откладывали в среднем{' '}
                  <b>{formatMoney(actual.average, { sign: true, whole: true })}</b> в месяц.
                </p>
              )}
            </section>

            <RecurringList kind="expense" items={ordered('expense')} total={totals.expense} categoryById={categoryById} />
            <RecurringList kind="income" items={ordered('income')} total={totals.income} categoryById={categoryById} />

            <Section title="Прогноз по месяцам">
              <div className="forecast-wrap">
                <table className="forecast">
                  <thead>
                    <tr>
                      <th scope="col">Месяц</th>
                      <th scope="col">Доходы</th>
                      <th scope="col">Расходы</th>
                      <th scope="col">На счетах</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.month} className={row.income < row.expense ? 'is-minus' : undefined}>
                        <th scope="row">
                          {monthShortTitle(row.month)}
                          {i === 0 && '*'}
                        </th>
                        <td className="is-income">{row.income ? `+${formatWhole(row.income)}` : '—'}</td>
                        <td className="forecast__expense">{row.expense ? formatWhole(-row.expense) : '—'}</td>
                        <td className={row.balance < 0 ? 'forecast__balance is-over' : 'forecast__balance'}>
                          {formatWhole(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field__hint">
                Суммы в евро, округлены. Сейчас на счетах {formatMoney(balance)}. * В {monthPrepositional(currentMonth())}{' '}
                учтены только платежи с сегодняшнего дня — более ранние уже в балансе.
              </p>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function RecurringList({
  kind,
  items,
  total,
  categoryById,
}: {
  kind: CategoryKind;
  items: Recurring[];
  total: number;
  categoryById: Map<number, Category>;
}) {
  const navigate = useNavigate();
  return (
    <Section
      title={kind === 'expense' ? 'Регулярные расходы' : 'Регулярные доходы'}
      aside={<span className="section__aside mono">{formatMoney(total, { whole: true })} в мес.</span>}
    >
      {items.length > 0 && (
        <div className="tx-list">
          {items.map((r) => {
            const category = r.categoryId != null ? categoryById.get(r.categoryId) : undefined;
            return (
              <button
                key={r.id}
                type="button"
                className={r.active ? 'tx' : 'tx is-paused'}
                onClick={() => navigate(`/plan/${r.id}`)}
              >
                <CatIcon icon={category?.icon ?? 'repeat'} color={category?.color ?? '#6B7680'} />
                <span className="tx__main">
                  <span className="tx__title">{r.name}</span>
                  <span className="tx__sub">{r.active ? describeSchedule(r) : 'На паузе — не входит в прогноз'}</span>
                </span>
                <span className="rec__amount">
                  <span className={`tx__amount tx__amount--${kind}`}>
                    {kind === 'income' ? formatMoney(r.amount, { sign: true }) : formatMoney(r.amount)}
                  </span>
                  {r.period !== 'month' && (
                    <span className="rec__monthly">≈&nbsp;{formatMoney(perMonth(r), { whole: true })}/мес</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <Link to={`/plan/new?kind=${kind}`} className="add-row">
        <Plus size={18} />
        {kind === 'expense' ? 'Добавить расход' : 'Добавить доход'}
      </Link>
    </Section>
  );
}

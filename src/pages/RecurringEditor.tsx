import { useLiveQuery } from 'dexie-react-hooks';
import { Trash } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConfirm, useToast } from '../components/Feedback';
import { Field, Segmented, SwitchRow, TopBar } from '../components/ui';
import { db, type CategoryKind, type Period } from '../db';
import { useCategories, useGoBack } from '../hooks';
import { shortDate, todayISO } from '../lib/dates';
import { centsToInput, formatMoney, parseAmount } from '../lib/format';
import { Icon } from '../lib/icons';
import { PERIOD_ORDER, PERIODS, perMonth, upcoming } from '../lib/plan';

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Расход' },
  { value: 'income', label: 'Доход' },
];

const PERIOD_OPTIONS = PERIOD_ORDER.map((p) => ({ value: p, label: PERIODS[p].label }));

/** Common names, one tap to fill the field. */
const NAME_PRESETS: Record<CategoryKind, string[]> = {
  expense: ['Аренда', 'Коммуналка', 'Интернет', 'Мобильная связь', 'Страховка', 'Подписки', 'Спортзал', 'Продукты'],
  income: ['Зарплата', 'Аванс', 'Подработка', 'Проценты по вкладу'],
};

export default function RecurringEditor() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const [params] = useSearchParams();
  const goBack = useGoBack('/plan');
  const toast = useToast();
  const confirm = useConfirm();

  const existing = useLiveQuery(async () => (editId ? ((await db.recurring.get(editId)) ?? null) : null), [editId]);
  const categories = useCategories();

  const [kind, setKind] = useState<CategoryKind>(params.get('kind') === 'income' ? 'income' : 'expense');
  const [amountText, setAmountText] = useState('');
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<Period>('month');
  const [startDate, setStartDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [active, setActive] = useState(true);
  const [loaded, setLoaded] = useState(editId === null);
  const [errors, setErrors] = useState<{ amount?: string; name?: string }>({});

  useEffect(() => {
    if (loaded || !existing) return;
    setKind(existing.kind);
    setAmountText(centsToInput(existing.amount));
    setName(existing.name);
    setPeriod(existing.period);
    setStartDate(existing.startDate);
    setCategoryId(existing.categoryId ?? null);
    setActive(existing.active);
    setLoaded(true);
  }, [loaded, existing]);

  if (existing === undefined || !categories || !loaded) return null;
  if (editId && existing === null) {
    return (
      <div className="screen">
        <TopBar title="Платёж" back="/plan" />
        <div className="screen__body empty">
          <p>Этот платёж удалён.</p>
        </div>
      </div>
    );
  }

  const amount = parseAmount(amountText);
  const isExpense = kind === 'expense';
  const next = upcoming({ period, startDate }, 3);
  const monthly = amount && amount > 0 && period !== 'month' ? perMonth({ amount, period }) : null;
  const kindCategories = categories.filter((c) => c.kind === kind && (!c.archived || c.id === categoryId));

  const changeKind = (k: CategoryKind) => {
    setKind(k);
    setCategoryId(null);
  };

  const save = async () => {
    const trimmed = name.trim();
    const nextErrors = {
      amount: amount && amount > 0 ? undefined : 'Введите сумму, например 950',
      name: trimmed ? undefined : 'Введите название, например «Аренда»',
    };
    setErrors(nextErrors);
    if (nextErrors.amount || nextErrors.name || !amount) return;

    const data = { kind, name: trimmed, amount, period, startDate, categoryId: categoryId ?? undefined, active };
    if (existing) {
      await db.recurring.update(existing.id, data);
      toast({ message: 'Изменения сохранены' });
    } else {
      await db.recurring.add({ ...data, createdAt: Date.now() });
      toast({ message: isExpense ? `Расход «${trimmed}» добавлен` : `Доход «${trimmed}» добавлен` });
    }
    goBack();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: 'Удалить из плана?',
      message: `«${existing.name}» пропадёт из списка и прогноза. Записанные операции останутся.`,
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    await db.recurring.delete(existing.id);
    toast({ message: 'Удалено из плана' });
    goBack();
  };

  const title = existing ? existing.name : isExpense ? 'Регулярный расход' : 'Регулярный доход';

  return (
    <div className="screen">
      <TopBar title={title} back="/plan" />
      <div className="screen__body">
        <Segmented label="Тип" options={KINDS} value={kind} onChange={changeKind} />

        <Field label="Сумма" htmlFor="rec-amount" error={errors.amount}>
          <div className="money-input">
            <input
              id="rec-amount"
              className="input money-input__field"
              inputMode="decimal"
              placeholder="0"
              value={amountText}
              autoComplete="off"
              onChange={(e) => {
                setAmountText(e.target.value);
                setErrors((cur) => ({ ...cur, amount: undefined }));
              }}
            />
            <span className="money-input__cur">€</span>
          </div>
          {monthly !== null && <p className="field__hint">В среднем {formatMoney(monthly)} в месяц</p>}
        </Field>

        <Field label="Название" htmlFor="rec-name" error={errors.name}>
          <input
            id="rec-name"
            className="input"
            value={name}
            maxLength={40}
            autoComplete="off"
            placeholder={isExpense ? 'Например, «Аренда»' : 'Например, «Зарплата»'}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((cur) => ({ ...cur, name: undefined }));
            }}
          />
          <div className="presets">
            {NAME_PRESETS[kind].map((preset) => (
              <button
                key={preset}
                type="button"
                className="preset"
                aria-pressed={name === preset}
                onClick={() => {
                  setName(preset);
                  setErrors((cur) => ({ ...cur, name: undefined }));
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Как часто">
          <Segmented label="Как часто" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        </Field>

        <Field
          label={isExpense ? 'Ближайший платёж' : 'Ближайшее поступление'}
          htmlFor="rec-date"
          hint={next.length > 0 ? `Ближайшие: ${next.map((d) => shortDate(d).toLowerCase()).join(', ')}…` : undefined}
        >
          <input
            id="rec-date"
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => e.target.value && setStartDate(e.target.value)}
          />
        </Field>

        <Field label="Категория — по желанию">
          <div className="cat-grid" role="radiogroup" aria-label="Категория">
            {kindCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === categoryId}
                className="cat-btn"
                style={{ '--c': c.color } as CSSProperties}
                onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
              >
                <span className="cat-ico">
                  <Icon name={c.icon} size={22} />
                </span>
                <span className="cat-btn__label">{c.name}</span>
              </button>
            ))}
          </div>
        </Field>

        <div className="field">
          <SwitchRow
            label="Учитывать в прогнозе"
            hint="Выключите, если платёж на паузе — он останется в списке"
            checked={active}
            onChange={setActive}
          />
        </div>

        {existing && (
          <div className="field list">
            <button type="button" className="row row--danger" onClick={remove}>
              <Trash size={20} strokeWidth={1.75} />
              <span className="row__label">Удалить из плана</span>
            </button>
          </div>
        )}

        <div className="sticky-foot">
          <button type="button" className="btn btn--primary btn--block" onClick={save}>
            {existing ? 'Сохранить' : 'Добавить в план'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays, Plus, Trash } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Feedback';
import { applyKey, Keypad } from '../components/Keypad';
import { Segmented, TopBar } from '../components/ui';
import { byNewest, db, type Account, type Transaction, type TxType } from '../db';
import { useAccounts, useCategories, useGoBack } from '../hooks';
import { addDays, shortDate, todayISO } from '../lib/dates';
import { centsToInput, parseAmount } from '../lib/format';
import { Icon } from '../lib/icons';
import { accountColor } from '../lib/palette';

const TYPES: { value: TxType; label: string }[] = [
  { value: 'expense', label: 'Расход' },
  { value: 'income', label: 'Доход' },
  { value: 'transfer', label: 'Перевод' },
];

const SAVED_MESSAGE: Record<TxType, string> = {
  expense: 'Расход записан',
  income: 'Доход записан',
  transfer: 'Перевод записан',
};

const parseType = (value: string | null): TxType =>
  value === 'income' || value === 'transfer' ? value : 'expense';

/** '1234,5' → '1 234,5' with a thin space between thousands. */
function groupDigits(amount: string): string {
  if (!amount) return '0';
  const [int, frac] = amount.split(',');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return frac === undefined ? grouped : `${grouped},${frac}`;
}

export default function TxForm() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const [params] = useSearchParams();
  const goBack = useGoBack('/');
  const toast = useToast();

  const accounts = useAccounts();
  const categories = useCategories();
  const existing = useLiveQuery(
    async () => (editId ? ((await db.transactions.get(editId)) ?? null) : null),
    [editId],
  );
  const recent = useLiveQuery(() => db.transactions.where('date').aboveOrEqual(addDays(todayISO(), -90)).toArray(), []);

  const [type, setType] = useState<TxType>(parseType(params.get('type')));
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [ready, setReady] = useState(false);

  const usableAccounts = useMemo(
    () =>
      (accounts ?? []).filter(
        (a) => !a.archived || a.id === existing?.accountId || a.id === existing?.toAccountId,
      ),
    [accounts, existing],
  );

  // Smart defaults: the account used last time for this type of operation;
  // for transfers, into a savings account when there is one.
  const defaultAccounts = useCallback(
    (t: TxType, from: number | null) => {
      const last = [...(recent ?? [])].sort(byNewest).find((x) => x.type === t);
      const usable = usableAccounts.filter((a) => !a.archived);
      const has = (accId?: number | null) => accId != null && usable.some((a) => a.id === accId);
      const fromId =
        from ?? (has(last?.accountId) ? last!.accountId : (usable.find((a) => a.type !== 'savings') ?? usable[0])?.id) ?? null;
      let toId: number | null = null;
      if (t === 'transfer') {
        toId =
          has(last?.toAccountId) && last!.toAccountId !== fromId
            ? last!.toAccountId!
            : ((usable.find((a) => a.type === 'savings' && a.id !== fromId) ?? usable.find((a) => a.id !== fromId))?.id ?? null);
      }
      return { fromId, toId };
    },
    [recent, usableAccounts],
  );

  useEffect(() => {
    if (ready || !accounts || !recent || existing === undefined) return;
    if (existing) {
      setType(existing.type);
      setAmount(centsToInput(existing.amount));
      setCategoryId(existing.categoryId ?? null);
      setAccountId(existing.accountId);
      setToAccountId(existing.toAccountId ?? null);
      setDate(existing.date);
      setNote(existing.note);
    } else {
      const { fromId, toId } = defaultAccounts(type, null);
      setAccountId(fromId);
      setToAccountId(toId);
    }
    setReady(true);
  }, [ready, accounts, recent, existing, type, defaultAccounts]);

  const changeType = (t: TxType) => {
    setType(t);
    setCategoryId(null);
    if (t === 'transfer' && (toAccountId === null || toAccountId === accountId)) {
      setToAccountId(defaultAccounts('transfer', accountId).toId);
    }
  };

  const usage = useMemo(() => {
    const counts = new Map<number, number>();
    for (const t of recent ?? []) {
      if (t.categoryId != null) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [recent]);

  // Most used categories first, so the usual ones are always within reach.
  const visibleCategories = useMemo(
    () =>
      (categories ?? [])
        .filter((c) => c.kind === type && (!c.archived || c.id === existing?.categoryId))
        .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.order - b.order),
    [categories, type, usage, existing],
  );

  const cents = parseAmount(amount) ?? 0;
  const problem =
    cents <= 0
      ? 'amount'
      : accountId === null
        ? 'Выберите счёт'
        : type === 'transfer'
          ? toAccountId === null || toAccountId === accountId
            ? 'Выберите счёт, куда переводите'
            : null
          : categoryId === null
            ? 'Выберите категорию'
            : null;

  const save = useCallback(async () => {
    if (problem || accountId === null) return;
    const data = {
      type,
      amount: cents,
      accountId,
      toAccountId: type === 'transfer' ? (toAccountId ?? undefined) : undefined,
      categoryId: type === 'transfer' ? undefined : (categoryId ?? undefined),
      date,
      note: note.trim(),
    };
    if (existing) await db.transactions.update(existing.id, data);
    else await db.transactions.add({ ...data, createdAt: Date.now() });
    navigator.vibrate?.(12);
    toast({ message: existing ? 'Изменения сохранены' : SAVED_MESSAGE[type] });
    goBack();
  }, [problem, type, cents, accountId, toAccountId, categoryId, date, note, existing, toast, goBack]);

  const remove = async () => {
    if (!existing) return;
    const removed: Transaction = existing;
    await db.transactions.delete(removed.id);
    toast({ message: 'Операция удалена', action: { label: 'Вернуть', onClick: () => db.transactions.add(removed) } });
    goBack();
  };

  const press = useCallback((key: string) => setAmount((cur) => applyKey(cur, key)), []);

  // Physical keyboard support (handy on a desktop browser).
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === ',' || e.key === '.') press(',');
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter' && !target.closest('button, a')) void saveRef.current();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [press]);

  if (!accounts || !categories || existing === undefined) return null;

  if (editId && existing === null) {
    return (
      <div className="screen">
        <TopBar title="Операция" />
        <div className="screen__body empty">
          <p>Эта операция удалена.</p>
        </div>
      </div>
    );
  }

  if (usableAccounts.length === 0) {
    return (
      <div className="screen">
        <TopBar title="Новая операция" />
        <div className="screen__body empty">
          <p>Чтобы записывать операции, сначала добавьте счёт.</p>
          <Link to="/accounts/new" className="btn btn--primary">
            Добавить счёт
          </Link>
        </div>
      </div>
    );
  }

  const sign = amount && type === 'expense' ? '−' : amount && type === 'income' ? '+' : '';

  return (
    <div className="txf">
      <TopBar
        title={existing ? 'Операция' : 'Новая операция'}
        actions={
          existing && (
            <button type="button" className="icon-action" aria-label="Удалить операцию" onClick={remove}>
              <Trash size={20} />
            </button>
          )
        }
      />
      <div className="txf__type">
        <Segmented label="Тип операции" options={TYPES} value={type} onChange={changeType} />
      </div>

      <div className={`amount amount--${type}`}>
        <p className={amount ? 'amount__value' : 'amount__value is-empty'} aria-live="polite">
          {sign}
          {groupDigits(amount)}
          <span className="amount__caret" aria-hidden="true" />
          <span className="amount__cur">€</span>
        </p>
        <p className="amount__hint">{problem && problem !== 'amount' ? problem : ''}</p>
      </div>

      <div className="txf__body">
        <AccountChips
          label={type === 'transfer' ? 'Откуда' : 'Счёт'}
          accounts={usableAccounts}
          value={accountId}
          onChange={setAccountId}
        />
        {type === 'transfer' && (
          <AccountChips
            label="Куда"
            accounts={usableAccounts.filter((a) => a.id !== accountId)}
            value={toAccountId}
            onChange={setToAccountId}
          />
        )}

        <div className="txf__meta">
          <label className="chip chip--date">
            <CalendarDays size={17} strokeWidth={1.75} />
            {shortDate(date)}
            <input
              type="date"
              className="chip__date-input"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              aria-label="Дата"
            />
          </label>
          <input
            className="chip chip--input"
            placeholder="Заметка"
            value={note}
            maxLength={80}
            enterKeyHint="done"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Заметка"
          />
        </div>

        {type !== 'transfer' && (
          <div className="cat-grid" role="radiogroup" aria-label="Категория">
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === categoryId}
                className="cat-btn"
                style={{ '--c': c.color } as CSSProperties}
                onClick={() => setCategoryId(c.id)}
              >
                <span className="cat-ico">
                  <Icon name={c.icon} size={22} />
                </span>
                <span className="cat-btn__label">{c.name}</span>
              </button>
            ))}
            <Link to={`/settings/categories/new?kind=${type}`} className="cat-btn">
              <span className="cat-ico cat-ico--add">
                <Plus size={22} strokeWidth={1.75} />
              </span>
              <span className="cat-btn__label">Новая</span>
            </Link>
          </div>
        )}
      </div>

      <Keypad onKey={press} onSubmit={save} canSubmit={!problem} />
    </div>
  );
}

function AccountChips({
  label,
  accounts,
  value,
  onChange,
}: {
  label: string;
  accounts: Account[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <div className="chips-field">
      <span className="chips-field__label">{label}</span>
      <div className="chips" role="radiogroup" aria-label={label}>
        {accounts.map((a) => {
          const c = accountColor(a.color);
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={a.id === value}
              className="chip"
              onClick={() => onChange(a.id)}
            >
              <span className="chip__dot" style={{ '--c1': c.from, '--c2': c.to } as CSSProperties}>
                <Icon name={a.icon} size={11} />
              </span>
              {a.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

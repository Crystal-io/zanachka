import { useLiveQuery } from 'dexie-react-hooks';
import { Archive, ArchiveRestore, ChevronRight, ScrollText, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AccountNote } from '../components/AccountNote';
import { useConfirm, useToast } from '../components/Feedback';
import { IconPicker, NoteColorPicker } from '../components/Pickers';
import { Field, SwitchRow, TopBar } from '../components/ui';
import { db } from '../db';
import { useBalances, useGoBack } from '../hooks';
import { centsToInput, parseAmount } from '../lib/format';
import { ACCOUNT_ICONS, Icon } from '../lib/icons';
import { ACCOUNT_TYPE_ORDER, ACCOUNT_TYPES, type AccountType } from '../lib/palette';

const isAccountType = (v: string | null): v is AccountType => v !== null && v in ACCOUNT_TYPES;

export default function AccountEditor() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const [params] = useSearchParams();
  const goBack = useGoBack('/accounts');
  const toast = useToast();
  const confirm = useConfirm();

  const existing = useLiveQuery(async () => (editId ? ((await db.accounts.get(editId)) ?? null) : null), [editId]);
  const balances = useBalances();
  const txCount = useLiveQuery(
    () =>
      editId
        ? db.transactions.where('accountId').equals(editId).or('toAccountId').equals(editId).count()
        : 0,
    [editId],
  );

  const startType = isAccountType(params.get('type')) ? (params.get('type') as AccountType) : 'card';
  const [type, setType] = useState<AccountType>(startType);
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [negative, setNegative] = useState(false);
  const [color, setColor] = useState<string>(ACCOUNT_TYPES[startType].color);
  const [icon, setIcon] = useState<string>(ACCOUNT_TYPES[startType].icon);
  const [includeInTotal, setIncludeInTotal] = useState(true);
  // Once the user picks a color or icon by hand, changing the type no longer overrides it.
  const [customLook, setCustomLook] = useState(false);
  const [loaded, setLoaded] = useState(editId === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loaded || !existing || !balances) return;
    const balance = balances.get(existing.id) ?? existing.initialBalance;
    setType(existing.type);
    setName(existing.name);
    setColor(existing.color);
    setIcon(existing.icon);
    setIncludeInTotal(existing.includeInTotal);
    setNegative(balance < 0);
    setAmountText(balance === 0 ? '' : centsToInput(balance));
    setCustomLook(true);
    setLoaded(true);
  }, [loaded, existing, balances]);

  if (existing === undefined || !balances || !loaded) return null;
  if (editId && existing === null) {
    return (
      <div className="screen">
        <TopBar title="Счёт" back="/accounts" />
        <div className="screen__body empty">
          <p>Этот счёт удалён.</p>
        </div>
      </div>
    );
  }

  const preset = ACCOUNT_TYPES[type];
  const displayName = name.trim() || preset.label;
  const parsed = amountText.trim() === '' ? 0 : parseAmount(amountText.replace('-', ''));
  const balance = parsed === null ? null : negative ? -parsed : parsed;

  const pickType = (t: AccountType) => {
    setType(t);
    if (!customLook) {
      setColor(ACCOUNT_TYPES[t].color);
      setIcon(ACCOUNT_TYPES[t].icon);
    }
  };

  const save = async () => {
    if (balance === null) {
      setError('Введите сумму цифрами, например 1250,50');
      return;
    }
    const fields = { name: displayName, type, color, icon, includeInTotal };
    if (existing) {
      // The user edits the current balance; shift the starting balance by the difference.
      const current = balances.get(existing.id) ?? existing.initialBalance;
      await db.accounts.update(existing.id, { ...fields, initialBalance: existing.initialBalance + balance - current });
      toast({ message: 'Счёт сохранён' });
    } else {
      await db.accounts.add({
        ...fields,
        initialBalance: balance,
        archived: false,
        order: await db.accounts.count(),
        createdAt: Date.now(),
      });
      toast({ message: `Счёт «${displayName}» создан` });
    }
    goBack();
  };

  const toggleArchive = async () => {
    if (!existing) return;
    await db.accounts.update(existing.id, { archived: !existing.archived });
    toast({ message: existing.archived ? 'Счёт возвращён из архива' : 'Счёт перемещён в архив' });
    goBack();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: 'Удалить счёт?',
      message: `«${existing.name}» будет удалён без возможности восстановления.`,
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    await db.accounts.delete(existing.id);
    toast({ message: 'Счёт удалён' });
    goBack();
  };

  return (
    <div className="screen">
      <TopBar title={existing ? 'Счёт' : 'Новый счёт'} back="/accounts" />
      <div className="screen__body">
        <div className="preview">
          <AccountNote account={{ name: displayName, type, color, icon, includeInTotal }} balance={balance ?? 0} />
        </div>

        <Field label="Тип">
          <div className="type-tiles" role="radiogroup" aria-label="Тип счёта">
            {ACCOUNT_TYPE_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={t === type}
                className="type-tile"
                onClick={() => pickType(t)}
              >
                <Icon name={ACCOUNT_TYPES[t].icon} size={22} />
                {ACCOUNT_TYPES[t].label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Название" htmlFor="acc-name">
          <input
            id="acc-name"
            className="input"
            placeholder={preset.placeholder}
            value={name}
            maxLength={32}
            autoComplete="off"
            enterKeyHint="next"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field
          label={existing ? 'Текущий баланс' : 'Сколько сейчас на счёте'}
          htmlFor="acc-balance"
          error={error}
          hint={
            existing
              ? 'Если сумма не совпадает с банком, впишите точную — баланс выровняется.'
              : 'Кнопка ± — для долга, например по кредитной карте.'
          }
        >
          <div className="money-input">
            <button
              type="button"
              className={negative ? 'money-input__sign is-negative' : 'money-input__sign'}
              aria-label={negative ? 'Сумма со знаком минус. Сделать положительной' : 'Сделать сумму отрицательной'}
              onClick={() => setNegative((v) => !v)}
            >
              {negative ? '−' : '+'}
            </button>
            <input
              id="acc-balance"
              className="input money-input__field"
              inputMode="decimal"
              placeholder="0"
              value={amountText}
              autoComplete="off"
              onChange={(e) => {
                setAmountText(e.target.value);
                setError(null);
              }}
            />
            <span className="money-input__cur">€</span>
          </div>
        </Field>

        <Field label="Цвет">
          <NoteColorPicker
            value={color}
            onChange={(c) => {
              setColor(c);
              setCustomLook(true);
            }}
          />
        </Field>

        <Field label="Значок">
          <IconPicker
            icons={ACCOUNT_ICONS}
            value={icon}
            onChange={(i) => {
              setIcon(i);
              setCustomLook(true);
            }}
          />
        </Field>

        <div className="field">
          <SwitchRow
            label="Учитывать в общем балансе"
            hint="Выключите для денег, которые не хотите видеть в итоговой сумме"
            checked={includeInTotal}
            onChange={setIncludeInTotal}
          />
        </div>

        {existing && (
          <div className="field list">
            <Link to={`/history?account=${existing.id}`} className="row">
              <ScrollText size={20} strokeWidth={1.75} />
              <span className="row__label">Операции по счёту</span>
              <span className="row__value">{txCount ?? ''}</span>
              <ChevronRight size={18} className="row__chev" />
            </Link>
            <button type="button" className="row" onClick={toggleArchive}>
              {existing.archived ? <ArchiveRestore size={20} strokeWidth={1.75} /> : <Archive size={20} strokeWidth={1.75} />}
              <span className="row__label">{existing.archived ? 'Вернуть из архива' : 'Переместить в архив'}</span>
            </button>
            {txCount === 0 && (
              <button type="button" className="row row--danger" onClick={remove}>
                <Trash size={20} strokeWidth={1.75} />
                <span className="row__label">Удалить счёт</span>
              </button>
            )}
          </div>
        )}
        {existing && (txCount ?? 0) > 0 && (
          <p className="field__hint">Счёт с операциями нельзя удалить — его можно убрать в архив, история сохранится.</p>
        )}

        <div className="sticky-foot">
          <button type="button" className="btn btn--primary btn--block" onClick={save}>
            {existing ? 'Сохранить' : 'Создать счёт'}
          </button>
        </div>
      </div>
    </div>
  );
}

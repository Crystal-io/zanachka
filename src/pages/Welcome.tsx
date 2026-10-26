import { Check } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { AccountNote } from '../components/AccountNote';
import { db } from '../db';
import { parseAmount } from '../lib/format';
import { Icon } from '../lib/icons';
import { ACCOUNT_TYPES, accountColor, type AccountType } from '../lib/palette';

const PRESETS: AccountType[] = ['card', 'cash', 'savings', 'bank'];

/** First run: tick where your money is and how much is there; the notes fan out as you go. */
export default function Welcome() {
  const [selected, setSelected] = useState<AccountType[]>(['card']);
  const [amounts, setAmounts] = useState<Partial<Record<AccountType, string>>>({});

  const toggle = (t: AccountType) =>
    setSelected((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : PRESETS.filter((p) => p === t || cur.includes(p))));

  const valueOf = (t: AccountType) => {
    const text = amounts[t]?.trim() ?? '';
    return text === '' ? 0 : parseAmount(text);
  };
  const invalid = selected.some((t) => valueOf(t) === null);

  const start = async () => {
    if (selected.length === 0 || invalid) return;
    const now = Date.now();
    await db.accounts.bulkAdd(
      selected.map((t, i) => ({
        name: ACCOUNT_TYPES[t].label,
        type: t,
        icon: ACCOUNT_TYPES[t].icon,
        color: ACCOUNT_TYPES[t].color,
        initialBalance: valueOf(t) ?? 0,
        includeInTotal: true,
        archived: false,
        order: i,
        createdAt: now,
      })),
    );
    // App redirects /welcome to the overview as soon as accounts exist.
  };

  return (
    <div className="welcome">
      <div className="fan" aria-hidden="true" style={{ '--n': selected.length } as CSSProperties}>
        {selected.map((t, i) => (
          <div key={t} className="fan__note" style={{ '--i': i } as CSSProperties}>
            <AccountNote
              account={{ name: ACCOUNT_TYPES[t].label, type: t, icon: ACCOUNT_TYPES[t].icon, color: ACCOUNT_TYPES[t].color, includeInTotal: true }}
              balance={valueOf(t) ?? 0}
              compact
            />
          </div>
        ))}
      </div>

      <h1 className="welcome__title">Заначка</h1>
      <p className="welcome__lead">
        Отметьте, где лежат ваши деньги, и впишите, сколько там сейчас. Названия и цвета можно поменять потом.
      </p>

      <ul className="picks">
        {PRESETS.map((t) => {
          const on = selected.includes(t);
          const preset = ACCOUNT_TYPES[t];
          const color = accountColor(preset.color);
          return (
            <li key={t} className={on ? 'pick is-on' : 'pick'}>
              <button type="button" className="pick__head" aria-pressed={on} onClick={() => toggle(t)}>
                <span className="pick__swatch" style={{ '--c1': color.from, '--c2': color.to } as CSSProperties}>
                  <Icon name={preset.icon} size={18} />
                </span>
                <span className="pick__text">
                  <span className="pick__label">{preset.label}</span>
                  <span className="pick__hint">{preset.hint}</span>
                </span>
                <span className="pick__check">{on && <Check size={16} strokeWidth={2.5} />}</span>
              </button>
              {on && (
                <label className="pick__amount">
                  <span>Сейчас на счёте</span>
                  <span className="pick__field">
                    <input
                      inputMode="decimal"
                      placeholder="0"
                      value={amounts[t] ?? ''}
                      autoComplete="off"
                      aria-invalid={valueOf(t) === null}
                      onChange={(e) => setAmounts((cur) => ({ ...cur, [t]: e.target.value }))}
                    />
                    €
                  </span>
                </label>
              )}
            </li>
          );
        })}
      </ul>

      {invalid && <p className="field__error">Суммы вводятся цифрами, например 1250,50</p>}
      <button type="button" className="btn btn--primary btn--block" disabled={selected.length === 0 || invalid} onClick={start}>
        Начать
      </button>
      <p className="welcome__foot">Данные хранятся только на этом телефоне, без регистрации.</p>
    </div>
  );
}

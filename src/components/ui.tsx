import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useGoBack } from '../hooks';
import { currentMonth, monthTitle, shiftMonth } from '../lib/dates';
import { Icon } from '../lib/icons';

export function TopBar({ title, back = '/', actions }: { title: string; back?: string; actions?: ReactNode }) {
  const goBack = useGoBack(back);
  return (
    <header className="topbar">
      <button type="button" className="icon-action" onClick={goBack} aria-label="Назад">
        <ArrowLeft size={22} />
      </button>
      <h1 className="topbar__title">{title}</h1>
      {actions}
    </header>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="seg__opt"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const isCurrent = month === currentMonth();
  return (
    <div className="month">
      <h1 className="month__title">{monthTitle(month)}</h1>
      {!isCurrent && (
        <button type="button" className="month__today" onClick={() => onChange(currentMonth())}>
          Текущий
        </button>
      )}
      <div className="month__nav">
        <button
          type="button"
          className="icon-action"
          aria-label="Предыдущий месяц"
          onClick={() => onChange(shiftMonth(month, -1))}
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          className="icon-action"
          aria-label="Следующий месяц"
          onClick={() => onChange(shiftMonth(month, 1))}
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="field__error">{error}</p> : hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="switch-row">
      <span className="switch-row__text">
        <span className="switch-row__label">{label}</span>
        {hint && <span className="switch-row__hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

/** Category glyph on a tinted rounded square. */
export function CatIcon({ icon, color, size = 'md' }: { icon?: string; color: string; size?: 'md' | 'lg' }) {
  return (
    <span className={size === 'lg' ? 'cat-ico cat-ico--lg' : 'cat-ico'} style={{ '--c': color } as CSSProperties}>
      <Icon name={icon ?? 'ellipsis'} size={size === 'lg' ? 30 : 20} />
    </span>
  );
}

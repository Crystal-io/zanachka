import { memo, useMemo, type CSSProperties, type ReactNode } from 'react';
import { moneyParts } from '../lib/format';
import { Icon } from '../lib/icons';
import { ACCOUNT_TYPES, accountColor, type AccountType } from '../lib/palette';

export interface NoteAccount {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  includeInTotal: boolean;
}

/**
 * An account drawn as a banknote: euro-series color, an engraved guilloché
 * pattern and the balance set large. The pattern is derived from the account's
 * look, so the preview while editing matches the saved card.
 */
export function AccountNote({
  account,
  balance,
  compact,
  onClick,
}: {
  account: NoteAccount;
  balance: number;
  compact?: boolean;
  onClick?: () => void;
}) {
  const color = accountColor(account.color);
  const parts = moneyParts(balance);
  const style = { '--c1': color.from, '--c2': color.to } as CSSProperties;
  const className = compact ? 'note note--compact' : 'note';

  const content: ReactNode = (
    <>
      <Guilloche seed={`${account.type}:${account.color}:${account.icon}`} />
      <span className="note__top">
        <span className="note__icon">
          <Icon name={account.icon} size={compact ? 15 : 18} />
        </span>
        <span className="note__type">{ACCOUNT_TYPES[account.type]?.label}</span>
        {!account.includeInTotal && <span className="note__badge">вне итога</span>}
      </span>
      <span className="note__bottom">
        <span className="note__name">{account.name}</span>
        <span className="note__balance">
          {parts.negative && '−'}
          {parts.int}
          <small>,{parts.frac}&nbsp;€</small>
        </span>
      </span>
    </>
  );

  return onClick ? (
    <button type="button" className={className} style={style} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={className} style={style}>
      {content}
    </div>
  );
}

const Guilloche = memo(function Guilloche({ seed }: { seed: string }) {
  const paths = useMemo(() => guillochePaths(hash(seed)), [seed]);
  return (
    <svg className="guilloche" viewBox="0 0 320 186" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="0.6">
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
});

/** Interleaved sine bands along the bottom and a rosette in the top-right corner. */
function guillochePaths(seed: number): string[] {
  const rnd = mulberry32(seed);
  const p1 = rnd() * Math.PI * 2;
  const p2 = rnd() * Math.PI * 2;
  const p3 = rnd() * Math.PI * 2;
  const lobes = 5 + Math.floor(rnd() * 4);
  const paths: string[] = [];

  for (let i = 0; i < 14; i++) {
    let d = '';
    for (let x = -8; x <= 328; x += 4) {
      const y = 112 + i * 3.4 + 9 * Math.sin(x / 32 + i * 0.22 + p1) + 4 * Math.sin(x / 12 - i * 0.4 + p2);
      d += `${x === -8 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
    }
    paths.push(d);
  }

  const cx = 262;
  const cy = 54;
  for (let k = 0; k < 12; k++) {
    let d = '';
    for (let s = 0; s <= 160; s++) {
      const t = (s / 160) * Math.PI * 2;
      const r = 20 + k * 1.4 + 7 * Math.sin(lobes * t + k * 0.12 + p3);
      d += `${s ? 'L' : 'M'}${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + r * Math.sin(t)).toFixed(1)}`;
    }
    paths.push(d + 'Z');
  }
  return paths;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

import type { CSSProperties } from 'react';
import { Icon } from '../lib/icons';
import { ACCOUNT_COLORS } from '../lib/palette';

export function NoteColorPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Цвет">
      {ACCOUNT_COLORS.map((c) => (
        <button
          key={c.key}
          type="button"
          role="radio"
          aria-checked={c.key === value}
          aria-label={c.name}
          className="swatch"
          style={{ '--c1': c.from, '--c2': c.to } as CSSProperties}
          onClick={() => onChange(c.key)}
        />
      ))}
    </div>
  );
}

export function ColorPicker({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="swatches swatches--6" role="radiogroup" aria-label="Цвет">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={c}
          className="swatch swatch--flat"
          style={{ '--c': c } as CSSProperties}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

export function IconPicker({
  icons,
  value,
  onChange,
}: {
  icons: string[];
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="glyphs" role="radiogroup" aria-label="Значок">
      {icons.map((name) => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={name === value}
          aria-label={name}
          className="glyph"
          onClick={() => onChange(name)}
        >
          <Icon name={name} size={22} />
        </button>
      ))}
    </div>
  );
}

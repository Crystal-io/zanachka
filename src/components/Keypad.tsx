import { Check, Delete } from 'lucide-react';
import { useRef } from 'react';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const MAX_INT_DIGITS = 7;

/** Applies a keypad key to the amount text ('1234,5'). 'clear' empties it. */
export function applyKey(current: string, key: string): string {
  if (key === 'clear') return '';
  if (key === 'back') return current.slice(0, -1);
  if (key === ',') return current.includes(',') ? current : (current || '0') + ',';
  const [int, frac] = current.split(',');
  if (frac !== undefined) return frac.length >= 2 ? current : current + key;
  if (int === '0') return key;
  return int.length >= MAX_INT_DIGITS ? current : current + key;
}

/** Number pad with a tall submit key. Hold backspace to clear. */
export function Keypad({
  onKey,
  onSubmit,
  canSubmit,
}: {
  onKey: (key: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);

  const startHold = () => {
    held.current = false;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      onKey('clear');
    }, 450);
  };
  const endHold = () => window.clearTimeout(holdTimer.current);

  return (
    <div className="keypad">
      {DIGITS.slice(0, 3).map((d) => (
        <Key key={d} label={d} onPress={() => onKey(d)} />
      ))}
      <button
        type="button"
        className="key key--fn"
        aria-label="Стереть"
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (!held.current) onKey('back');
        }}
      >
        <Delete size={24} strokeWidth={1.75} />
      </button>
      {DIGITS.slice(3, 6).map((d) => (
        <Key key={d} label={d} onPress={() => onKey(d)} />
      ))}
      <button type="button" className="key key--submit" aria-label="Записать" disabled={!canSubmit} onClick={onSubmit}>
        <Check size={30} strokeWidth={2.25} />
      </button>
      {DIGITS.slice(6).map((d) => (
        <Key key={d} label={d} onPress={() => onKey(d)} />
      ))}
      <Key label="0" wide onPress={() => onKey('0')} />
      <Key label="," onPress={() => onKey(',')} />
    </div>
  );
}

function Key({ label, wide, onPress }: { label: string; wide?: boolean; onPress: () => void }) {
  return (
    <button type="button" className={wide ? 'key key--wide' : 'key'} onClick={onPress}>
      {label}
    </button>
  );
}

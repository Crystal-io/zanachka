// Money is always an integer number of euro cents — never floats.

const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR' });
const moneyWhole = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 0 });

const MINUS = '−';

/** 1234.5 € → '1 234,50 €'. `sign` adds '+' to positive values, `whole` drops cents. */
export function formatMoney(cents: number, opts: { sign?: boolean; whole?: boolean } = {}): string {
  const text = (opts.whole ? moneyWhole : money).format(Math.abs(cents) / 100);
  if (cents < 0) return MINUS + text;
  if (opts.sign && cents > 0) return '+' + text;
  return text;
}

/** Splits an amount for display with smaller cents: { int: '1 234', frac: '50' }. */
export function moneyParts(cents: number) {
  const abs = Math.abs(cents);
  return {
    negative: cents < 0,
    int: integer.format(Math.floor(abs / 100)),
    frac: String(abs % 100).padStart(2, '0'),
  };
}

export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}

/** Parses user input like '12,5', '1 250.00' or '-30' into cents. Returns null if invalid. */
export function parseAmount(input: string): number | null {
  const t = input.replace(/[\s  ]/g, '').replace(',', '.').replace(MINUS, '-');
  if (!/^-?(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

/** Cents → editable text: 1250 → '12,5', 120000 → '1200'. */
export function centsToInput(cents: number): string {
  const abs = Math.abs(cents);
  const text = abs % 100 === 0 ? String(abs / 100) : (abs / 100).toFixed(2).replace(/0$/, '');
  return text.replace('.', ',');
}

/** Russian plural: plural(5, ['день', 'дня', 'дней']) → 'дней'. */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

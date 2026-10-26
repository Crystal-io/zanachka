import type { IconKey } from './icons';

/** Account card colors, borrowed from the euro banknote series (5 € grey … 500 € violet). */
export const ACCOUNT_COLORS = [
  { key: 'blue', name: 'Синий', from: '#4274C2', to: '#1A3266' },
  { key: 'green', name: 'Зелёный', from: '#3AA36E', to: '#145236' },
  { key: 'ochre', name: 'Охра', from: '#D6A740', to: '#7F5A16' },
  { key: 'orange', name: 'Оранжевый', from: '#EA8C42', to: '#9C4A15' },
  { key: 'red', name: 'Красный', from: '#D55B4D', to: '#842821' },
  { key: 'violet', name: 'Фиолетовый', from: '#9063B8', to: '#43245C' },
  { key: 'slate', name: 'Серый', from: '#7D8791', to: '#3A434B' },
  { key: 'ink', name: 'Графит', from: '#3A4552', to: '#10151B' },
] as const;

export type AccountColorKey = (typeof ACCOUNT_COLORS)[number]['key'];

export function accountColor(key: string) {
  return ACCOUNT_COLORS.find((c) => c.key === key) ?? ACCOUNT_COLORS[0];
}

export type AccountType = 'card' | 'cash' | 'savings' | 'bank' | 'other';

export const ACCOUNT_TYPES: Record<
  AccountType,
  { label: string; hint: string; icon: IconKey; color: AccountColorKey; placeholder: string }
> = {
  card: {
    label: 'Карта',
    hint: 'Дебетовая или кредитная',
    icon: 'credit-card',
    color: 'blue',
    placeholder: 'Например, «Основная карта»',
  },
  cash: {
    label: 'Наличные',
    hint: 'Деньги в кошельке',
    icon: 'banknote',
    color: 'green',
    placeholder: 'Например, «Кошелёк»',
  },
  savings: {
    label: 'Накопления',
    hint: 'Куда вы откладываете',
    icon: 'piggy-bank',
    color: 'ochre',
    placeholder: 'Например, «Подушка безопасности»',
  },
  bank: {
    label: 'Счёт в банке',
    hint: 'Текущий или расчётный',
    icon: 'landmark',
    color: 'slate',
    placeholder: 'Например, «Текущий счёт»',
  },
  other: {
    label: 'Другое',
    hint: 'Электронный кошелёк и прочее',
    icon: 'wallet',
    color: 'violet',
    placeholder: 'Например, «PayPal»',
  },
};

export const ACCOUNT_TYPE_ORDER: AccountType[] = ['card', 'cash', 'savings', 'bank', 'other'];

/** Category colors: mid-tones that read on both light and dark backgrounds. */
export const CATEGORY_COLORS = [
  '#2F8F5B', '#D98A2B', '#3C6FC4', '#8A5BB8', '#C9A227', '#1F8A8A',
  '#C43C5C', '#B8487A', '#5464B0', '#C9543F', '#2A8FB8', '#6B7680',
];

import {
  ArrowRightLeft, Baby, Banknote, Bike, Book, Briefcase, Building, Bus, Car, Coffee, Coins, CreditCard, Dumbbell,
  Ellipsis, Film, Fuel, Gamepad2, Gem, Gift, GraduationCap, HandCoins, Hammer, Heart, HeartPulse,
  House, Landmark, Laptop, PawPrint, PiggyBank, Pill, Pizza, Plane, Receipt, Repeat, RotateCcw,
  Scissors, Shield, Shirt, ShoppingBag, ShoppingCart, Smartphone, Sofa, Sparkles, Stethoscope,
  Ticket, TrainFront, TrendingUp, Tv, Utensils, Vault, Wallet, Wifi, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react';

export const ICONS = {
  baby: Baby, banknote: Banknote, bike: Bike, book: Book, briefcase: Briefcase, building: Building,
  bus: Bus, car: Car, coffee: Coffee, coins: Coins, 'credit-card': CreditCard, dumbbell: Dumbbell,
  ellipsis: Ellipsis, film: Film, fuel: Fuel, gamepad: Gamepad2, gem: Gem, gift: Gift,
  'graduation-cap': GraduationCap, 'hand-coins': HandCoins, hammer: Hammer, heart: Heart,
  'heart-pulse': HeartPulse, house: House, landmark: Landmark, laptop: Laptop, paw: PawPrint,
  'piggy-bank': PiggyBank, pill: Pill, pizza: Pizza, plane: Plane, receipt: Receipt, repeat: Repeat,
  'rotate-ccw': RotateCcw, scissors: Scissors, shield: Shield, shirt: Shirt, 'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart, smartphone: Smartphone, sofa: Sofa, sparkles: Sparkles,
  stethoscope: Stethoscope, ticket: Ticket, train: TrainFront, 'trending-up': TrendingUp, tv: Tv,
  utensils: Utensils, vault: Vault, wallet: Wallet, wifi: Wifi, wrench: Wrench, zap: Zap,
  transfer: ArrowRightLeft,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

export const ACCOUNT_ICONS: IconKey[] = [
  'credit-card', 'banknote', 'piggy-bank', 'landmark', 'wallet', 'vault',
  'coins', 'hand-coins', 'smartphone', 'briefcase', 'gem', 'shield',
  'house', 'car', 'plane', 'graduation-cap', 'gift', 'heart',
];

export const CATEGORY_ICONS: IconKey[] = [
  'shopping-cart', 'utensils', 'coffee', 'pizza', 'bus', 'train',
  'car', 'fuel', 'house', 'sofa', 'zap', 'wifi',
  'smartphone', 'tv', 'heart-pulse', 'pill', 'stethoscope', 'shirt',
  'shopping-bag', 'scissors', 'ticket', 'film', 'gamepad', 'book',
  'graduation-cap', 'dumbbell', 'bike', 'plane', 'gift', 'baby',
  'paw', 'wrench', 'hammer', 'repeat', 'receipt', 'sparkles',
  'briefcase', 'laptop', 'trending-up', 'rotate-ccw', 'coins', 'ellipsis',
];

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const Component = ICONS[name as IconKey] ?? Ellipsis;
  return <Component size={size} strokeWidth={1.75} aria-hidden="true" />;
}

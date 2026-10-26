import { ChevronRight, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { CatIcon, Section, Segmented, TopBar } from '../components/ui';
import type { Category, CategoryKind } from '../db';
import { useCategories } from '../hooks';

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
];

export default function Categories() {
  const [params, setParams] = useSearchParams();
  const kind: CategoryKind = params.get('kind') === 'income' ? 'income' : 'expense';
  const categories = useCategories();
  if (!categories) return null;

  const ofKind = categories.filter((c) => c.kind === kind);
  const rows = (list: Category[]) => (
    <div className="list">
      {list.map((c) => (
        <Link key={c.id} to={`/settings/categories/${c.id}`} className="row">
          <CatIcon icon={c.icon} color={c.color} />
          <span className="row__label">{c.name}</span>
          <ChevronRight size={18} className="row__chev" />
        </Link>
      ))}
    </div>
  );
  const hidden = ofKind.filter((c) => c.archived);

  return (
    <div className="screen">
      <TopBar title="Категории" back="/settings" />
      <div className="screen__body">
        <Segmented label="Вид категорий" options={KINDS} value={kind} onChange={(k) => setParams({ kind: k }, { replace: true })} />
        <div className="field">{rows(ofKind.filter((c) => !c.archived))}</div>
        <div className="field">
          <Link to={`/settings/categories/new?kind=${kind}`} className="btn btn--ghost btn--block">
            <Plus size={18} />
            Новая категория
          </Link>
        </div>
        {hidden.length > 0 && <Section title="Скрытые">{rows(hidden)}</Section>}
      </div>
    </div>
  );
}

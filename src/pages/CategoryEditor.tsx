import { useLiveQuery } from 'dexie-react-hooks';
import { Eye, EyeOff, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConfirm, useToast } from '../components/Feedback';
import { ColorPicker, IconPicker } from '../components/Pickers';
import { CatIcon, Field, Segmented, TopBar } from '../components/ui';
import { db, type CategoryKind } from '../db';
import { useGoBack } from '../hooks';
import { CATEGORY_ICONS } from '../lib/icons';
import { CATEGORY_COLORS } from '../lib/palette';

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Расход' },
  { value: 'income', label: 'Доход' },
];

export default function CategoryEditor() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const [params] = useSearchParams();
  const goBack = useGoBack('/settings/categories');
  const toast = useToast();
  const confirm = useConfirm();

  const existing = useLiveQuery(async () => (editId ? ((await db.categories.get(editId)) ?? null) : null), [editId]);
  const usage = useLiveQuery(() => (editId ? db.transactions.where('categoryId').equals(editId).count() : 0), [editId]);

  const [kind, setKind] = useState<CategoryKind>(params.get('kind') === 'income' ? 'income' : 'expense');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>('shopping-bag');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [loaded, setLoaded] = useState(editId === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loaded || !existing) return;
    setKind(existing.kind);
    setName(existing.name);
    setIcon(existing.icon);
    setColor(existing.color);
    setLoaded(true);
  }, [loaded, existing]);

  if (existing === undefined || !loaded) return null;

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Введите название');
      return;
    }
    if (existing) {
      await db.categories.update(existing.id, { name: trimmed, icon, color });
      toast({ message: 'Категория сохранена' });
    } else {
      await db.categories.add({ name: trimmed, kind, icon, color, order: await db.categories.count(), archived: false });
      toast({ message: `Категория «${trimmed}» создана` });
    }
    goBack();
  };

  const toggleHidden = async () => {
    if (!existing) return;
    await db.categories.update(existing.id, { archived: !existing.archived });
    toast({ message: existing.archived ? 'Категория снова в списке' : 'Категория скрыта' });
    goBack();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({ title: 'Удалить категорию?', message: `«${existing.name}» будет удалена.`, confirmLabel: 'Удалить', danger: true });
    if (!ok) return;
    await db.categories.delete(existing.id);
    toast({ message: 'Категория удалена' });
    goBack();
  };

  return (
    <div className="screen">
      <TopBar title={existing ? 'Категория' : 'Новая категория'} back="/settings/categories" />
      <div className="screen__body">
        <div className="cat-preview">
          <CatIcon icon={icon} color={color} size="lg" />
          <span className="cat-preview__name">{name.trim() || 'Название'}</span>
        </div>
        {!existing && (
          <Field label="Вид">
            <Segmented label="Вид категории" options={KINDS} value={kind} onChange={setKind} />
          </Field>
        )}
        <Field label="Название" htmlFor="cat-name" error={error}>
          <input
            id="cat-name"
            className="input"
            value={name}
            maxLength={28}
            autoComplete="off"
            placeholder={kind === 'expense' ? 'Например, «Спорт»' : 'Например, «Фриланс»'}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field label="Цвет">
          <ColorPicker colors={CATEGORY_COLORS} value={color} onChange={setColor} />
        </Field>
        <Field label="Значок">
          <IconPicker icons={CATEGORY_ICONS} value={icon} onChange={setIcon} />
        </Field>
        {existing && (
          <div className="field list">
            <button type="button" className="row" onClick={toggleHidden}>
              {existing.archived ? <Eye size={20} strokeWidth={1.75} /> : <EyeOff size={20} strokeWidth={1.75} />}
              <span className="row__label">{existing.archived ? 'Вернуть в список' : 'Скрыть из списка'}</span>
            </button>
            {usage === 0 && (
              <button type="button" className="row row--danger" onClick={remove}>
                <Trash size={20} strokeWidth={1.75} />
                <span className="row__label">Удалить категорию</span>
              </button>
            )}
          </div>
        )}
        <div className="sticky-foot">
          <button type="button" className="btn btn--primary btn--block" onClick={save}>
            {existing ? 'Сохранить' : 'Создать категорию'}
          </button>
        </div>
      </div>
    </div>
  );
}

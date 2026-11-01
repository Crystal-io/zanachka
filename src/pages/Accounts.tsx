import {
  closestCenter,
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, Hand, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountNote } from '../components/AccountNote';
import { Section } from '../components/ui';
import { db, type Account } from '../db';
import { useAccounts, useBalances } from '../hooks';
import { formatMoney, moneyParts } from '../lib/format';
import { Icon } from '../lib/icons';

/** A tap right after a drop shouldn't open the card that was just moved. */
const CLICK_GUARD_MS = 350;

export default function Accounts() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const balances = useBalances();
  const active = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts]);

  // Local order so a drop lands instantly; it follows the database once the write comes back.
  const [order, setOrder] = useState<number[]>([]);
  useEffect(() => setOrder(active.map((a) => a.id)), [active]);
  const [liftedId, setLiftedId] = useState<number | null>(null);
  const lastDrop = useRef(0);

  // Hold to lift (so normal scrolling keeps working), then drag.
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 280, tolerance: 8 } }),
    useSensor(MouseSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );

  if (!accounts || !balances) return null;

  const byId = new Map(active.map((a) => [a.id, a]));
  const ids = order.length === active.length && order.every((id) => byId.has(id)) ? order : active.map((a) => a.id);
  const archived = accounts.filter((a) => a.archived);
  const inTotal = active.filter((a) => a.includeInTotal);
  const balanceOf = (id: number) => balances.get(id) ?? 0;
  const total = inTotal.reduce((sum, a) => sum + balanceOf(a.id), 0);
  const savings = inTotal.filter((a) => a.type === 'savings').reduce((sum, a) => sum + balanceOf(a.id), 0);
  const totalParts = moneyParts(total);
  const lifted = liftedId !== null ? byId.get(liftedId) : undefined;

  const open = (id: number) => {
    if (Date.now() - lastDrop.current > CLICK_GUARD_MS) navigate(`/accounts/${id}`);
  };

  const onDragStart = ({ active: item }: DragStartEvent) => {
    setLiftedId(Number(item.id));
    navigator.vibrate?.(15);
  };

  const onDragEnd = ({ active: item, over }: DragEndEvent) => {
    setLiftedId(null);
    lastDrop.current = Date.now();
    if (!over || item.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(Number(item.id)), ids.indexOf(Number(over.id)));
    setOrder(next);
    navigator.vibrate?.(8);
    void db.transaction('rw', db.accounts, () =>
      Promise.all(next.map((id, index) => db.accounts.update(id, { order: index }))),
    );
  };

  const onDragCancel = () => {
    setLiftedId(null);
    lastDrop.current = Date.now();
  };

  return (
    <>
      <h1 className="page-title">Счета</h1>
      <div className="total">
        <p className="eyebrow">Всего на счетах</p>
        <p className="total__value">
          {totalParts.negative && '−'}
          {totalParts.int}
          <small>,{totalParts.frac}&nbsp;€</small>
        </p>
        {savings > 0 && <p className="total__sub">из них в накоплениях {formatMoney(savings)}</p>}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="notes">
            {ids.map((id) => {
              const account = byId.get(id);
              return (
                account && (
                  <SortableNote key={id} account={account} balance={balanceOf(id)} onOpen={() => open(id)} />
                )
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          {lifted && (
            <div className="note-lifted">
              <AccountNote account={lifted} balance={balanceOf(lifted.id)} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {active.length > 1 && (
        <p className="notes-hint">
          <Hand size={16} strokeWidth={1.75} aria-hidden="true" />
          Удерживайте карточку и перетащите, чтобы поменять порядок
        </p>
      )}

      <div className="notes notes--tail">
        <Link to="/accounts/new" className="note-add">
          <Plus size={26} />
          Новый счёт
        </Link>
      </div>

      {archived.length > 0 && (
        <Section title="В архиве">
          <div className="list">
            {archived.map((a) => (
              <Link key={a.id} to={`/accounts/${a.id}`} className="row">
                <Icon name={a.icon} size={20} />
                <span className="row__label">{a.name}</span>
                <span className="row__value mono">{formatMoney(balanceOf(a.id))}</span>
                <ChevronRight size={18} className="row__chev" />
              </Link>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/** A note in the list; while it is lifted, its place shows as an empty slot. */
function SortableNote({ account, balance, onOpen }: { account: Account; balance: number; onOpen: () => void }) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: account.id });
  return (
    <div
      ref={setNodeRef}
      className={isDragging ? 'sortable is-empty-slot' : 'sortable'}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onContextMenu={(e) => e.preventDefault()}
      {...listeners}
    >
      <AccountNote account={account} balance={balance} onClick={onOpen} />
    </div>
  );
}

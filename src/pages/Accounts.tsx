import { ChevronRight, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountNote } from '../components/AccountNote';
import { Section } from '../components/ui';
import { useAccounts, useBalances } from '../hooks';
import { formatMoney, moneyParts } from '../lib/format';
import { Icon } from '../lib/icons';

export default function Accounts() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const balances = useBalances();
  if (!accounts || !balances) return null;

  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const inTotal = active.filter((a) => a.includeInTotal);
  const balanceOf = (id: number) => balances.get(id) ?? 0;
  const total = inTotal.reduce((sum, a) => sum + balanceOf(a.id), 0);
  const savings = inTotal.filter((a) => a.type === 'savings').reduce((sum, a) => sum + balanceOf(a.id), 0);
  const totalParts = moneyParts(total);

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

      <div className="notes">
        {active.map((a) => (
          <AccountNote key={a.id} account={a} balance={balanceOf(a.id)} onClick={() => navigate(`/accounts/${a.id}`)} />
        ))}
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

import { useLiveQuery } from 'dexie-react-hooks';
import { LayoutDashboard, Plus, ScrollText, Settings2, WalletCards } from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { db } from './db';
import AccountEditor from './pages/AccountEditor';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import CategoryEditor from './pages/CategoryEditor';
import History from './pages/History';
import Home from './pages/Home';
import Settings from './pages/Settings';
import TxForm from './pages/TxForm';
import Welcome from './pages/Welcome';

export default function App() {
  const accountCount = useLiveQuery(() => db.accounts.count(), []);
  if (accountCount === undefined) return null;

  return (
    <Routes>
      <Route path="welcome" element={accountCount > 0 ? <Navigate to="/" replace /> : <Welcome />} />
      <Route element={<TabsLayout />}>
        <Route index element={accountCount === 0 ? <Navigate to="/welcome" replace /> : <Home />} />
        <Route path="history" element={<History />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="add" element={<TxForm />} />
      <Route path="tx/:id" element={<TxForm />} />
      <Route path="accounts/new" element={<AccountEditor />} />
      <Route path="accounts/:id" element={<AccountEditor />} />
      <Route path="settings/categories" element={<Categories />} />
      <Route path="settings/categories/new" element={<CategoryEditor />} />
      <Route path="settings/categories/:id" element={<CategoryEditor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const TABS = [
  { to: '/', label: 'Обзор', Icon: LayoutDashboard },
  { to: '/history', label: 'История', Icon: ScrollText },
  { to: '/accounts', label: 'Счета', Icon: WalletCards },
  { to: '/settings', label: 'Ещё', Icon: Settings2 },
];

function TabsLayout() {
  const tab = (t: (typeof TABS)[number]) => (
    <NavLink key={t.to} to={t.to} end className="nav__item">
      <span className="nav__pill">
        <t.Icon size={22} strokeWidth={1.75} />
      </span>
      <span className="nav__label">{t.label}</span>
    </NavLink>
  );

  return (
    <div className="tabs">
      <main className="tabs__main">
        <Outlet />
      </main>
      <nav className="nav" aria-label="Разделы">
        {TABS.slice(0, 2).map(tab)}
        <Link to="/add?type=expense" className="nav__fab" aria-label="Добавить операцию">
          <Plus size={28} strokeWidth={2.25} />
        </Link>
        {TABS.slice(2).map(tab)}
      </nav>
    </div>
  );
}

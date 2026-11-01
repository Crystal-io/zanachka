import { useLiveQuery } from 'dexie-react-hooks';
import { LayoutDashboard, Plus, ScrollText, Settings2, WalletCards } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { useToast } from './components/Feedback';
import { db, getMeta, setMeta } from './db';
import { applyPendingUpdate } from './lib/updates';
import AccountEditor from './pages/AccountEditor';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import CategoryEditor from './pages/CategoryEditor';
import History from './pages/History';
import Home from './pages/Home';
import Plan from './pages/Plan';
import RecurringEditor from './pages/RecurringEditor';
import Settings from './pages/Settings';
import TxForm from './pages/TxForm';
import Welcome from './pages/Welcome';

export default function App() {
  const accountCount = useLiveQuery(() => db.accounts.count(), []);
  if (accountCount === undefined) return null;

  return (
    <>
      <RouteEffects />
      <VersionNotice />
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
        <Route path="plan" element={<Plan />} />
        <Route path="plan/new" element={<RecurringEditor />} />
        <Route path="plan/:id" element={<RecurringEditor />} />
        <Route path="accounts/new" element={<AccountEditor />} />
        <Route path="accounts/:id" element={<AccountEditor />} />
        <Route path="settings/categories" element={<Categories />} />
        <Route path="settings/categories/new" element={<CategoryEditor />} />
        <Route path="settings/categories/:id" element={<CategoryEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

/**
 * New screens open at the top; going back keeps the browser's restored scroll
 * position. Leaving an editor is also the moment a downloaded update can apply.
 */
function RouteEffects() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
    applyPendingUpdate();
  }, [pathname, navigationType]);
  return null;
}

const CHANGELOG_URL = 'https://github.com/Crystal-io/zanachka#что-нового';
// Effects run twice in development (StrictMode); the notice must show once.
let versionChecked = false;

/** «Заначка обновлена до версии …» on the first start of a new version. */
function VersionNotice() {
  const toast = useToast();
  useEffect(() => {
    if (versionChecked) return;
    versionChecked = true;
    void (async () => {
      const seen = await getMeta<string>('lastSeenVersion');
      if (seen === __APP_VERSION__) return;
      await setMeta('lastSeenVersion', __APP_VERSION__);
      // Nothing to announce on a fresh install. Versions before 0.4.0 didn't record themselves,
      // so existing data means this is an update too.
      const updated = seen !== undefined || (await db.accounts.count()) > 0;
      if (updated) {
        toast({
          message: `Заначка обновлена до версии ${__APP_VERSION__}`,
          action: { label: 'Что нового', onClick: () => window.open(CHANGELOG_URL, '_blank', 'noopener') },
        });
      }
    })();
  }, [toast]);
  return null;
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

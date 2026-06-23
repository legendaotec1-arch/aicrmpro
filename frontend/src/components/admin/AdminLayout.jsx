import { useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  KanbanSquare,
  FolderOpen,
  Wallet,
  KeyRound,
  Megaphone,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import Button from '../ui/Button';
import BrandName from '../brand/BrandName';

const TABS = [
  { id: 'overview', label: 'Сводка', icon: LayoutDashboard },
  { id: 'tasks', label: 'Задачи', icon: KanbanSquare },
  { id: 'drive', label: 'Облако', icon: FolderOpen },
  { id: 'finance', label: 'Финансы', icon: Wallet },
  { id: 'ads', label: 'Реклама', icon: Megaphone },
  { id: 'vault', label: 'Доступы', icon: KeyRound },
];

export default function AdminLayout({ children, onRefresh, refreshing, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';

  const setTab = (id) => {
    setSearchParams(id === 'overview' ? {} : { tab: id });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Админка</p>
            <h1 className="text-xl font-bold text-slate-900">
              <BrandName /> — рабочее пространство
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh ? (
              <Button type="button" variant="secondary" size="sm" onClick={onRefresh} loading={refreshing}>
                <RefreshCw size={16} className="mr-1.5" />
                Обновить
              </Button>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={onLogout}>
              <LogOut size={16} className="mr-1.5" />
              Выйти
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

export function useAdminTab() {
  const [searchParams] = useSearchParams();
  return searchParams.get('tab') || 'overview';
}

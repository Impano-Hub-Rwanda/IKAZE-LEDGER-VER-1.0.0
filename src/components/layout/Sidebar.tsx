import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  CreditCard,
  Banknote,
  FileText,
  Settings,
  FilePlus2,
  HelpCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { to: '/customers', labelKey: 'customers', icon: Users },
  { to: '/products', labelKey: 'products', icon: Package },
  { to: '/inventory', labelKey: 'inventory', icon: Warehouse },
  { to: '/debts', labelKey: 'debts', icon: CreditCard },
  { to: '/payments', labelKey: 'payments', icon: Banknote },
  { to: '/proforma', labelKey: 'proforma', icon: FilePlus2 },
  { to: '/reports', labelKey: 'reports', icon: FileText },
  { to: '/help', labelKey: 'help', icon: HelpCircle },
  { to: '/settings', labelKey: 'settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin');

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-desk dark:border-slate-700 dark:bg-slate-800 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5 dark:border-slate-700">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 shadow-desk-sm">
            <svg viewBox="0 0 64 64" className="h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M20 44V20h10a6 6 0 0 1 0 12h-4"
                stroke="#fff"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="44" cy="42" r="3" fill="#facc15" />
            </svg>
          </div>
          <span className="truncate text-sm font-bold text-slate-800 dark:text-white">
            {t.app.name}
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `nav-item-base ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{t.nav[item.labelKey as keyof typeof t.nav]}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-700">
          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
            <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
              {user?.full_name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user?.role === 'admin' ? 'Administrator' : 'Employee'}
            </p>
          </div>
          <p className="mt-2 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
            Powered by MUD
          </p>
        </div>
      </aside>
    </>
  );
}

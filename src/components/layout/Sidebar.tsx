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
  ChevronRight,
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

  const items = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'admin',
  );

  const userName = user?.full_name?.trim() || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="
            fixed inset-0 z-30
            bg-slate-950/35
            backdrop-blur-[2px]
            lg:hidden
          "
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Main navigation"
        className={`
          fixed inset-y-0 left-0 z-40
          flex w-60 flex-col
          overflow-hidden
          border-r border-slate-200/80
          bg-white
          shadow-[4px_0_24px_rgba(15,23,42,0.035)]
          transition-transform duration-200 ease-out
          dark:border-slate-700/80
          dark:bg-slate-900
          dark:shadow-[4px_0_24px_rgba(0,0,0,0.15)]
          lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div
          className="
            flex h-16 shrink-0 items-center
            gap-3
            border-b border-slate-200/80
            px-4
            dark:border-slate-700/80
          "
        >
          <div
            className="
              flex h-9 w-9 shrink-0
              items-center justify-center
              rounded-[9px]
              bg-teal-600
              shadow-sm
              dark:bg-teal-500
            "
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 64 64"
              className="h-5 w-5"
              fill="none"
            >
              <path
                d="M20 44V20h10a6 6 0 0 1 0 12h-4"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="44"
                cy="42"
                r="3"
                fill="#facc15"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="
                truncate
                text-sm font-bold
                tracking-tight
                text-slate-900
                dark:text-white
              "
            >
              {t.app.name}
            </p>

            <p
              className="
                truncate
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.14em]
                text-slate-400
                dark:text-slate-500
              "
            >
              Ledger
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="
            flex-1
            overflow-y-auto
            overflow-x-hidden
            px-3 py-4
            scrollbar-thin
          "
        >
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
                    group
                    relative
                    flex h-10
                    items-center
                    gap-3
                    rounded-[9px]
                    px-3
                    text-sm
                    font-medium
                    transition-[background-color,color,box-shadow]
                    duration-150
                    ease-out
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-teal-500/50
                    ${
                      isActive
                        ? `
                          bg-teal-50
                          text-teal-700
                          shadow-[0_1px_2px_rgba(15,23,42,0.04)]
                          dark:bg-teal-900/35
                          dark:text-teal-300
                        `
                        : `
                          text-slate-600
                          hover:bg-slate-100/80
                          hover:text-slate-900
                          dark:text-slate-300
                          dark:hover:bg-slate-800
                          dark:hover:text-white
                        `
                    }
                    `
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator */}
                      <span
                        aria-hidden="true"
                        className={`
                          absolute left-0
                          h-5 w-[3px]
                          rounded-r-full
                          bg-teal-600
                          dark:bg-teal-400
                          transition-opacity duration-150
                          ${isActive ? 'opacity-100' : 'opacity-0'}
                        `}
                      />

                      {/* Icon */}
                      <Icon
                        aria-hidden="true"
                        className={`
                          h-[18px] w-[18px]
                          shrink-0
                          transition-colors duration-150
                          ${
                            isActive
                              ? 'text-teal-600 dark:text-teal-400'
                              : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                          }
                        `}
                        strokeWidth={isActive ? 2.2 : 1.9}
                      />

                      {/* Label */}
                      <span className="min-w-0 flex-1 truncate">
                        {t.nav[
                          item.labelKey as keyof typeof t.nav
                        ]}
                      </span>

                      {/* Active indicator arrow */}
                      <ChevronRight
                        aria-hidden="true"
                        className={`
                          h-3.5 w-3.5
                          shrink-0
                          transition-opacity duration-150
                          ${
                            isActive
                              ? 'opacity-100'
                              : 'opacity-0'
                          }
                        `}
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div
          className="
            shrink-0
            border-t border-slate-200/80
            p-3
            dark:border-slate-700/80
          "
        >
          <div
            className="
              flex items-center
              gap-3
              rounded-[9px]
              border border-slate-200/70
              bg-slate-50/80
              px-3 py-2.5
              dark:border-slate-700
              dark:bg-slate-800
            "
          >
            {/* Avatar */}
            <div
              className="
                flex h-8 w-8 shrink-0
                items-center justify-center
                rounded-full
                bg-teal-100
                text-xs font-bold
                text-teal-700
                dark:bg-teal-900/50
                dark:text-teal-300
              "
              aria-hidden="true"
            >
              {userInitial}
            </div>

            {/* User details */}
            <div className="min-w-0 flex-1">
              <p
                className="
                  truncate
                  text-xs font-semibold
                  text-slate-700
                  dark:text-slate-200
                "
              >
                {userName}
              </p>

              <p
                className="
                  mt-0.5
                  truncate
                  text-[10px]
                  font-medium
                  text-slate-400
                  dark:text-slate-500
                "
              >
                {user?.role === 'admin'
                  ? 'Administrator'
                  : 'Employee'}
              </p>
            </div>
          </div>

          <p
            className="
              mt-2
              text-center
              text-[9px]
              font-medium
              tracking-wide
              text-slate-400
              dark:text-slate-500
            "
          >
            IKAZE Ledger · MUD
          </p>
        </div>
      </aside>
    </>
  );
}

import { Menu, Sun, Moon, Globe, LogOut, KeyRound, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90 lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search / Command Palette trigger */}
      <button
        onClick={onSearchClick}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-400"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search everywhere...</span>
        <kbd className="ml-2 hidden rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-medium dark:border-slate-500 md:inline">
          Ctrl+K
        </kbd>
      </button>

      <div className="flex-1" />

      {/* Language toggle */}
      <button
        onClick={() => setLanguage(language === 'en' ? 'rw' : 'en')}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Toggle language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{language === 'en' ? 'EN' : 'RW'}</span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      {/* User + logout */}
      <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-700 sm:flex">
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {user?.full_name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.role === 'admin' ? 'Administrator' : 'Employee'}
          </p>
        </div>
        <button
          onClick={() => navigate('/change-password')}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label={t.auth.changePasswordTitle}
          title={t.auth.changePasswordTitle}
        >
          <KeyRound className="h-5 w-5" />
        </button>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
        aria-label={t.nav.logout}
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">{t.nav.logout}</span>
      </button>
    </header>
  );
}

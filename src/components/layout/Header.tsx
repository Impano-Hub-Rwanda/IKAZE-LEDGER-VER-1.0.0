import {
  Menu,
  Sun,
  Moon,
  Globe,
  LogOut,
  KeyRound,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function Header({
  onMenuClick,
  onSearchClick,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      className="
        sticky top-0 z-20
        flex h-14 shrink-0 items-center
        gap-2
        border-b border-slate-200/80
        bg-white
        px-4
        dark:border-slate-700/80
        dark:bg-slate-800
        lg:px-6
      "
    >
      {/* =================================================
          MOBILE MENU
         ================================================= */}
      <button
        type="button"
        onClick={onMenuClick}
        className="
          flex h-9 w-9 shrink-0
          items-center justify-center
          rounded-lg
          text-slate-500
          transition-[background-color,color]
          duration-150
          hover:bg-slate-100
          hover:text-slate-800
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-teal-500/50
          dark:text-slate-400
          dark:hover:bg-slate-700
          dark:hover:text-white
          lg:hidden
        "
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* =================================================
          SEARCH / COMMAND PALETTE
         ================================================= */}
      <button
        type="button"
        onClick={onSearchClick}
        className="
          group
          flex h-9
          min-w-0
          items-center
          gap-2
          rounded-lg
          border border-slate-200
          bg-slate-50
          px-3
          text-sm
          text-slate-400
          transition-[background-color,border-color,color,box-shadow]
          duration-150
          hover:border-slate-300
          hover:bg-white
          hover:text-slate-500
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-teal-500/40
          dark:border-slate-600
          dark:bg-slate-700/50
          dark:text-slate-400
          dark:hover:border-slate-500
          dark:hover:bg-slate-700
          dark:hover:text-slate-300
        "
        aria-label="Search everywhere"
      >
        <Search
          className="
            h-4 w-4 shrink-0
            text-slate-400
            transition-colors
            group-hover:text-teal-600
            dark:group-hover:text-teal-400
          "
        />

        <span className="hidden truncate sm:inline">
          Search everywhere...
        </span>

        <kbd
          className="
            ml-1 hidden shrink-0
            rounded-md
            border border-slate-200
            bg-white
            px-1.5 py-0.5
            text-[10px]
            font-medium
            text-slate-400
            shadow-sm
            md:inline
            dark:border-slate-500
            dark:bg-slate-700
            dark:text-slate-400
          "
        >
          Ctrl+K
        </kbd>
      </button>

      {/* =================================================
          FLEXIBLE SPACE
         ================================================= */}
      <div className="min-w-0 flex-1" />

      {/* =================================================
          LANGUAGE
         ================================================= */}
      <button
        type="button"
        onClick={() =>
          setLanguage(language === 'en' ? 'rw' : 'en')
        }
        className="
          flex h-9
          items-center
          gap-1.5
          rounded-lg
          px-2.5
          text-xs
          font-semibold
          text-slate-500
          transition-[background-color,color]
          duration-150
          hover:bg-slate-100
          hover:text-slate-800
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-teal-500/50
          dark:text-slate-400
          dark:hover:bg-slate-700
          dark:hover:text-white
        "
        aria-label="Toggle language"
        title={
          language === 'en'
            ? 'Switch to Kinyarwanda'
            : 'Switch to English'
        }
      >
        <Globe className="h-4 w-4" />

        <span className="hidden sm:inline">
          {language === 'en' ? 'EN' : 'RW'}
        </span>
      </button>

      {/* =================================================
          THEME
         ================================================= */}
      <button
        type="button"
        onClick={toggleTheme}
        className="
          flex h-9 w-9
          items-center justify-center
          rounded-lg
          text-slate-500
          transition-[background-color,color]
          duration-150
          hover:bg-slate-100
          hover:text-slate-800
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-teal-500/50
          dark:text-slate-400
          dark:hover:bg-slate-700
          dark:hover:text-white
        "
        aria-label={
          theme === 'light'
            ? 'Switch to dark mode'
            : 'Switch to light mode'
        }
        title={
          theme === 'light'
            ? 'Dark mode'
            : 'Light mode'
        }
      >
        {theme === 'light' ? (
          <Moon className="h-[18px] w-[18px]" />
        ) : (
          <Sun className="h-[18px] w-[18px]" />
        )}
      </button>

      {/* =================================================
          USER SECTION
         ================================================= */}
      <div
        className="
          hidden
          h-8
          items-center
          gap-3
          border-l
          border-slate-200
          pl-3
          sm:flex
          dark:border-slate-700
        "
      >
        {/* User information */}
        <div className="max-w-[150px] text-right">
          <p
            className="
              truncate
              text-xs
              font-semibold
              text-slate-800
              dark:text-slate-200
            "
          >
            {user?.full_name || 'User'}
          </p>

          <p
            className="
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

        {/* Change password */}
        <button
          type="button"
          onClick={() => navigate('/change-password')}
          className="
            flex h-8 w-8
            items-center justify-center
            rounded-lg
            text-slate-500
            transition-[background-color,color]
            duration-150
            hover:bg-slate-100
            hover:text-slate-800
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-teal-500/50
            dark:text-slate-400
            dark:hover:bg-slate-700
            dark:hover:text-white
          "
          aria-label={t.auth.changePasswordTitle}
          title={t.auth.changePasswordTitle}
        >
          <KeyRound className="h-[17px] w-[17px]" />
        </button>
      </div>

      {/* =================================================
          LOGOUT
         ================================================= */}
      <button
        type="button"
        onClick={logout}
        className="
          flex h-9
          items-center
          gap-1.5
          rounded-lg
          px-2.5
          text-xs
          font-semibold
          text-red-600
          transition-[background-color,color]
          duration-150
          hover:bg-red-50
          hover:text-red-700
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-red-500/40
          dark:text-red-400
          dark:hover:bg-red-900/30
          dark:hover:text-red-300
          sm:px-3
        "
        aria-label={t.nav.logout}
        title={t.nav.logout}
      >
        <LogOut className="h-4 w-4 shrink-0" />

        <span className="hidden sm:inline">
          {t.nav.logout}
        </span>
      </button>
    </header>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './i18n';
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './router';
import { initDatabase } from './lib/database';
import { startAutoBackupService } from './lib/autoBackup';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppInner() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const start = useCallback(async () => {
    try {
      await initDatabase();
      setDbReady(true);
      // Never compete with first-screen rendering/login. The periodic service is lightweight
      // and can start after the app has become interactive.
      window.setTimeout(() => startAutoBackupService(), 3000);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void start();
  }, [start]);

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center dark:border-red-800 dark:bg-slate-800">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mb-2 text-lg font-bold text-red-600 dark:text-red-400">{t.ui.databaseError}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{dbError}</p>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            {t.ui.restartApplication}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            {t.ui.reloadApplication}
          </button>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-6 dark:bg-slate-950">
        <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative w-full max-w-3xl">
          <div className="mx-auto mb-7 flex w-fit flex-col items-center">
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-teal-500/10" />
              <div className="absolute inset-1 animate-spin rounded-2xl border-2 border-teal-500/20 border-t-teal-600" />
              <img src="/icon.png" alt="Ikaze Ledger" className="relative h-14 w-14 rounded-xl object-contain shadow-xl" loading="eager" decoding="async" />
            </div>
            <div className="flex items-center gap-2 text-2xl font-extrabold tracking-[0.12em]">
              <span className="text-slate-800 dark:text-white">IKAZE</span><span className="text-teal-600">LEDGER</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-teal-600" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{t.ui.loadingIkaze}</p>
            <p className="mt-1 text-xs text-slate-400">{t.ui.offlineSecureLocal}</p>
          </div>

          {/* Startup skeleton: real dashboard shape appears immediately after DB is ready */}
          <div className="grid grid-cols-2 gap-3 opacity-60 sm:grid-cols-4">
            {[1,2,3,4].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" />)}
          </div>
          <div className="mt-4 h-48 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider dbReady={dbReady}>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppInner />
      </LanguageProvider>
    </ThemeProvider>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider } from './i18n';
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './router';
import { initDatabase } from './lib/database';
import { startAutoBackupService } from './lib/autoBackup';
import { Spinner } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppInner() {
  const { theme } = useTheme();
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
      startAutoBackupService();
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
          <h1 className="mb-2 text-lg font-bold text-red-600 dark:text-red-400">Database Error</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{dbError}</p>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Please restart the application. If the problem continues, contact support.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading Ikaze Ledger…</p>
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

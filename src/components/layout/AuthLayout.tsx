import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-green-50 px-4 py-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/icon.svg" alt="Ikaze Ledger" className="mb-3 h-16 w-16 rounded-2xl shadow-lg" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-desk-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

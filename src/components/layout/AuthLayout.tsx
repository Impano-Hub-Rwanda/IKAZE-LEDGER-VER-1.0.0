import type { ReactNode } from 'react';
import { useLanguage } from '../../i18n';
import { useEffect, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { minimizeWindow, toggleMaximizeWindow, closeWindow, startDragging, isTauri } from '../../lib/tauri';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  clientCount?: number;
}

export function AuthLayout({ children, title, subtitle, clientCount }: AuthLayoutProps) {
  const { t } = useLanguage();
  const [desktop, setDesktop] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => { setDesktop(isTauri()); }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A2135] px-4 pb-6 pt-14 sm:px-6">
      {desktop && (
        <div
          className="absolute left-0 right-0 top-0 z-50 flex h-9 items-center justify-between border-b border-white/10 bg-[#071b2b]/95 backdrop-blur-sm"
          onMouseDown={() => void startDragging()}
          onDoubleClick={() => { void toggleMaximizeWindow(); setMaximized((v) => !v); }}
        >
          <div className="flex h-full items-center gap-2 pl-3">
            <img src="/icon.png" alt="" className="h-5 w-5 rounded object-contain" loading="eager" decoding="async" />
            <span className="select-none text-xs font-semibold text-slate-200">Ikaze Ledger</span>
          </div>
          <div className="flex h-full">
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => void minimizeWindow()} className="flex h-full w-11 items-center justify-center text-slate-300 hover:bg-white/10" aria-label="Minimize"><Minus className="h-4 w-4" /></button>
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => { void toggleMaximizeWindow(); setMaximized((v) => !v); }} className="flex h-full w-11 items-center justify-center text-slate-300 hover:bg-white/10" aria-label="Maximize">{maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}</button>
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => void closeWindow()} className="flex h-full w-11 items-center justify-center text-slate-300 hover:bg-red-500 hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      {/* Lightweight branded background — no expensive blur animation */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#008CFF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#20D878]/10 blur-3xl" />

      {/* Partner panel: deliberately positioned far left on desktop */}
      <aside className="absolute left-5 top-1/2 hidden -translate-y-1/2 lg:flex xl:left-10 2xl:left-16">
        <div className="w-52 rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-center shadow-xl backdrop-blur-sm">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300">
            {t.auth.ourPartner}
          </p>
          <div className="flex h-28 items-center justify-center rounded-xl bg-white p-3 shadow-lg">
            <img
              src="/partner-logo.png"
              alt={t.auth.ourPartner}
              className="max-h-full max-w-full object-contain"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </aside>

      {/* Centered authentication content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-[#008CFF]/20 blur-xl" />
            <img
              src="/icon.png"
              alt="Ikaze Ledger"
              className="relative h-14 w-14 rounded-xl object-contain shadow-xl ring-1 ring-white/10"
              loading="eager"
              decoding="async"
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-extrabold tracking-[0.16em] text-white">IKAZE</span>
            <span className="text-2xl font-extrabold tracking-[0.07em] text-[#20D878]">LEDGER</span>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-0.5 w-7 rounded-full bg-[#008CFF]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Smart Business Management
            </span>
            <div className="h-0.5 w-7 rounded-full bg-[#20D878]" />
          </div>

          {typeof clientCount === 'number' && (
            <div className="mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#008CFF] to-[#20D878] text-[9px] font-bold text-white">#</span>
              <span className="text-[11px] font-medium text-slate-300">{t.auth.clientsOnDevice}</span>
              <span className="text-sm font-extrabold text-[#20D878]">{clientCount.toLocaleString()}</span>
            </div>
          )}

          <h1 className="mt-4 text-xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1 max-w-sm text-sm text-slate-400">{subtitle}</p>}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#008CFF] via-[#008CFF] to-[#20D878]" />
          {children}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#20D878]/50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#20D878]" />
          </span>
          <span className="text-[10px] font-medium tracking-wide text-slate-400">{t.auth.offlineSecureLocal}</span>
        </div>
        <p className="mt-1 text-center text-[10px] text-slate-500">{t.auth.poweredByMud}</p>
      </div>
    </div>
  );
}

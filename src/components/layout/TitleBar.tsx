import { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { minimizeWindow, toggleMaximizeWindow, closeWindow, startDragging, isTauri } from '../../lib/tauri';

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(isTauri());
  }, []);

  if (!desktop) return null;

  return (
    <div
      className="flex h-9 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90"
      onMouseDown={() => void startDragging()}
      onDoubleClick={() => void toggleMaximizeWindow()}
    >
      {/* Left: app icon + name */}
      <div className="flex h-full items-center gap-2 pl-3">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-teal-600">
          <svg viewBox="0 0 64 64" className="h-3.5 w-3.5" fill="none">
            <path d="M20 44V20h10a6 6 0 0 1 0 12h-4" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="44" cy="42" r="3" fill="#facc15" />
          </svg>
        </div>
        <span className="select-none text-xs font-semibold text-slate-700 dark:text-slate-200">
          Ikaze Ledger
        </span>
      </div>

      {/* Right: window controls */}
      <div className="flex h-full">
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => void minimizeWindow()}
          className="flex h-full w-11 items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          aria-label="Minimize"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => { void toggleMaximizeWindow(); setMaximized(!maximized); }}
          className="flex h-full w-11 items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          aria-label="Maximize"
        >
          {maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => void closeWindow()}
          className="flex h-full w-11 items-center justify-center text-slate-500 transition-colors hover:bg-red-500 hover:text-white dark:text-slate-400"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

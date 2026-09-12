import { useCallback, useEffect, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import {
  minimizeWindow,
  toggleMaximizeWindow,
  closeWindow,
  startDragging,
  isTauri,
} from '../../lib/tauri';

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(isTauri());
  }, []);

  const handleMinimize = useCallback(() => {
    void minimizeWindow();
  }, []);

  const handleMaximize = useCallback(() => {
    void toggleMaximizeWindow();
    setMaximized((current) => !current);
  }, []);

  const handleClose = useCallback(() => {
    void closeWindow();
  }, []);

  const handleDoubleClick = useCallback(() => {
    void toggleMaximizeWindow();
    setMaximized((current) => !current);
  }, []);

  const handleDrag = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Only allow primary mouse button to drag the window.
      if (event.button !== 0) return;

      void startDragging();
    },
    [],
  );

  if (!desktop) return null;

  return (
    <div
      className="
        flex h-9 shrink-0 select-none items-center
        border-b border-slate-200
        bg-white/95
        text-slate-700
        backdrop-blur-sm
        dark:border-slate-700
        dark:bg-slate-900/95
        dark:text-slate-200
      "
      onMouseDown={handleDrag}
      onDoubleClick={handleDoubleClick}
    >
      {/* -------------------------------------------------
          LEFT — APPLICATION IDENTITY
         ------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 items-center gap-2 pl-3">
        <div
          className="
            flex h-5 w-5 shrink-0 items-center justify-center
            rounded-[5px]
            bg-teal-600
            shadow-sm
            dark:bg-teal-500
          "
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 64 64"
            className="h-3.5 w-3.5"
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

        <span
          className="
            truncate
            text-[11px]
            font-semibold
            tracking-[0.01em]
            text-slate-700
            dark:text-slate-200
          "
        >
          Ikaze Ledger
        </span>
      </div>

      {/* -------------------------------------------------
          RIGHT — WINDOW CONTROLS
         ------------------------------------------------- */}
      <div
        className="flex h-full shrink-0 items-stretch"
        onMouseDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {/* Minimize */}
        <button
          type="button"
          onClick={handleMinimize}
          className="
            group
            flex h-full w-11
            items-center justify-center
            text-slate-500
            transition-colors duration-100
            hover:bg-slate-100
            hover:text-slate-800
            focus:outline-none
            focus-visible:bg-slate-100
            dark:text-slate-400
            dark:hover:bg-slate-800
            dark:hover:text-slate-100
            dark:focus-visible:bg-slate-800
          "
          aria-label="Minimize window"
          title="Minimize"
        >
          <Minus
            className="
              h-4 w-4
              transition-transform duration-100
              group-active:scale-90
            "
            strokeWidth={1.8}
          />
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={handleMaximize}
          className="
            group
            flex h-full w-11
            items-center justify-center
            text-slate-500
            transition-colors duration-100
            hover:bg-slate-100
            hover:text-slate-800
            focus:outline-none
            focus-visible:bg-slate-100
            dark:text-slate-400
            dark:hover:bg-slate-800
            dark:hover:text-slate-100
            dark:focus-visible:bg-slate-800
          "
          aria-label={maximized ? 'Restore window' : 'Maximize window'}
          title={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? (
            <Copy
              className="
                h-3.5 w-3.5
                transition-transform duration-100
                group-active:scale-90
              "
              strokeWidth={1.7}
            />
          ) : (
            <Square
              className="
                h-3.5 w-3.5
                transition-transform duration-100
                group-active:scale-90
              "
              strokeWidth={1.7}
            />
          )}
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          className="
            group
            flex h-full w-11
            items-center justify-center
            text-slate-500
            transition-colors duration-100
            hover:bg-red-500
            hover:text-white
            focus:outline-none
            focus-visible:bg-red-500
            focus-visible:text-white
            dark:text-slate-400
            dark:hover:bg-red-600
            dark:focus-visible:bg-red-600
          "
          aria-label="Close window"
          title="Close"
        >
          <X
            className="
              h-4 w-4
              transition-transform duration-100
              group-active:scale-90
            "
            strokeWidth={1.8}
          />
        </button>
      </div>
    </div>
  );
}

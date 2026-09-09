import { useState, useEffect, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, Minus, Square, X, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, popLockedPage } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n';
import { Button } from '../ui/Button';
import { minimizeWindow, toggleMaximizeWindow, closeWindow, startDragging, isTauri } from '../../lib/tauri';
import { Input } from '../ui/Input';

export function PinLockScreen() {
  const { unlock, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => { setDesktop(isTauri()); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await unlock(value);
    if (result.ok) {
      // Restore the page the user was on when the app locked
      const savedPage = popLockedPage();
      navigate(savedPage ?? '/dashboard', { replace: true });
    } else {
      setError(result.error || 'Invalid PIN');
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      {desktop && (
        <div className="absolute left-0 right-0 top-0 z-50 flex h-9 items-center justify-between border-b border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-800/95" onMouseDown={() => void startDragging()} onDoubleClick={() => { void toggleMaximizeWindow(); setMaximized((v) => !v); }}>
          <div className="flex h-full items-center gap-2 pl-3"><img src="/icon.png" alt="" className="h-5 w-5 rounded object-contain" /><span className="select-none text-xs font-semibold text-slate-700 dark:text-slate-200">Ikaze Ledger</span></div>
          <div className="flex h-full">
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => void minimizeWindow()} className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" aria-label="Minimize"><Minus className="h-4 w-4" /></button>
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => { void toggleMaximizeWindow(); setMaximized((v) => !v); }} className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" aria-label="Maximize">{maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}</button>
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => void closeWindow()} className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-red-500 hover:text-white dark:text-slate-300" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
            <Lock className="h-7 w-7 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {t.app.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter your PIN or password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="PIN or password"
              autoFocus
              maxLength={32}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button type="submit" fullWidth disabled={loading || !value}>
            {loading ? 'Verifying…' : 'Unlock'}
          </Button>
        </form>

        {user && (
          <p className="mt-4 text-center text-xs text-slate-400">
            Signed in as {user.full_name}
          </p>
        )}
      </div>
    </div>
  );
}

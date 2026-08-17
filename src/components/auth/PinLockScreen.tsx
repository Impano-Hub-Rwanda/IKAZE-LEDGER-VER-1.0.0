import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, popLockedPage } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function PinLockScreen() {
  const { unlock, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
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

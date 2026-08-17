import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User as UserIcon } from 'lucide-react';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { Spinner } from '../../../components/ui/Spinner';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../i18n';

export function LoginForm() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError(t.auth.loginError);
      return;
    }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(result.error === 'inactive' ? t.auth.loginInactive : t.auth.loginError);
    }
  };

  return (
    <AuthLayout title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="relative">
          <UserIcon className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t.auth.loginUsername}
            className="pl-10"
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.loginPassword}
            className="pl-10"
            autoComplete="current-password"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">
            <Link
              to="/forgot-password"
              className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
            >
              {t.auth.forgotPassword}
            </Link>
          </span>
        </div>

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? <Spinner size="sm" /> : t.auth.loginButton}
        </Button>

        <div className="text-center">
          <Link
            to="/setup"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {t.auth.needAccount}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

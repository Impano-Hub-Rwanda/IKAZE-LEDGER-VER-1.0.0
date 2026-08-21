import {
  useState,
  useEffect,
  type FormEvent,
} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  User as UserIcon,
  Users,
  ShieldCheck,
} from 'lucide-react';

import { AuthLayout } from '../../../components/layout/AuthLayout';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { Spinner } from '../../../components/ui/Spinner';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';

export function LoginForm() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /*
   * ------------------------------------------------------------
   * OFFLINE CLIENT COUNT
   *
   * This comes directly from the local database.
   * No internet/API is required.
   * ------------------------------------------------------------
   */
  const [clientCount, setClientCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadClientCount = async () => {
      try {
        const db = getDb();

        const result = await db.query<{ count: number | string }>(
          `SELECT COUNT(*) AS count FROM customers`,
        );

        const count = Number(
          result.rows[0]?.count ?? 0,
        );

        if (mounted) {
          setClientCount(
            Number.isFinite(count) ? count : 0,
          );
        }
      } catch {
        /*
         * Login should NEVER fail just because
         * the client counter cannot be loaded.
         */
        if (mounted) {
          setClientCount(0);
        }
      }
    };

    void loadClientCount();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError(t.auth.loginError);
      return;
    }

    setLoading(true);

    const result = await login(
      username,
      password,
    );

    setLoading(false);

    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(
        result.error === 'inactive'
          ? t.auth.loginInactive
          : t.auth.loginError,
      );
    }
  };

  return (
    <AuthLayout
      title={t.auth.loginTitle}
      subtitle={t.auth.loginSubtitle}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {/* USERNAME */}
        <div className="relative">
          <UserIcon
            className="
              pointer-events-none
              absolute
              left-3
              top-1/2
              z-10
              h-5
              w-5
              -translate-y-1/2
              text-[#008CFF]
            "
          />

          <Input
            name="username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder={t.auth.loginUsername}
            className="
              pl-10
              focus:border-[#008CFF]
              focus:ring-[#008CFF]
            "
            autoComplete="username"
            autoFocus
          />
        </div>

        {/* PASSWORD */}
        <div className="relative">
          <Lock
            className="
              pointer-events-none
              absolute
              left-3
              top-1/2
              z-10
              h-5
              w-5
              -translate-y-1/2
              text-[#20D878]
            "
          />

          <Input
            type="password"
            name="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder={t.auth.loginPassword}
            className="
              pl-10
              focus:border-[#20D878]
              focus:ring-[#20D878]
            "
            autoComplete="current-password"
          />
        </div>

        {/* FORGOT PASSWORD */}
        <div className="flex items-center justify-between">
          <span className="text-sm">
            <Link
              to="/forgot-password"
              className="
                font-medium
                text-[#008CFF]
                hover:text-[#006FCC]
              "
            >
              {t.auth.forgotPassword}
            </Link>
          </span>
        </div>

        {/* LOGIN BUTTON */}
        <Button
          type="submit"
          fullWidth
          disabled={loading}
        >
          {loading ? (
            <Spinner size="sm" />
          ) : (
            t.auth.loginButton
          )}
        </Button>

        {/* CREATE ACCOUNT */}
        <div className="text-center">
          <Link
            to="/setup"
            className="
              text-sm
              text-slate-500
              transition-colors
              hover:text-[#008CFF]
              dark:text-slate-400
            "
          >
            {t.auth.needAccount}
          </Link>
        </div>

        {/* ----------------------------------------------------
            OFFLINE CLIENT STATISTIC
            ---------------------------------------------------- */}
        <div className="pt-3">
          <div
            className="
              relative
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-gradient-to-br
              from-[#071A2D]
              via-[#0B2239]
              to-[#071A2D]
              px-5
              py-4
              shadow-sm
              dark:border-slate-700
            "
          >
            {/* subtle blue glow */}
            <div
              className="
                pointer-events-none
                absolute
                -right-8
                -top-8
                h-24
                w-24
                rounded-full
                bg-[#008CFF]
                opacity-10
                blur-2xl
              "
            />

            {/* subtle green glow */}
            <div
              className="
                pointer-events-none
                absolute
                -bottom-8
                -left-8
                h-24
                w-24
                rounded-full
                bg-[#20D878]
                opacity-10
                blur-2xl
              "
            />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-lg
                    bg-gradient-to-br
                    from-[#008CFF]
                    to-[#20D878]
                    shadow-lg
                  "
                >
                  <Users
                    className="h-5 w-5 text-white"
                  />
                </div>

                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.18em]
                      text-slate-400
                    "
                  >
                    Your Clients
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-sm
                      font-medium
                      text-white
                    "
                  >
                    Customers in your system
                  </p>
                </div>
              </div>

              <div className="text-right">
                {clientCount === null ? (
                  <div
                    className="
                      h-8
                      w-12
                      animate-pulse
                      rounded-md
                      bg-white/10
                    "
                  />
                ) : (
                  <p
                    className="
                      text-2xl
                      font-extrabold
                      leading-none
                      text-white
                    "
                  >
                    {clientCount}
                  </p>
                )}

                <p
                  className="
                    mt-1
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-widest
                    text-[#20D878]
                  "
                >
                  Clients
                </p>
              </div>
            </div>

            <div
              className="
                relative
                mt-3
                flex
                items-center
                justify-center
                gap-1.5
                border-t
                border-white/10
                pt-3
              "
            >
              <ShieldCheck
                className="h-3.5 w-3.5 text-[#20D878]"
              />

              <span
                className="
                  text-[10px]
                  font-medium
                  text-slate-400
                "
              >
                Offline • Secure • Local Database
              </span>
            </div>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}

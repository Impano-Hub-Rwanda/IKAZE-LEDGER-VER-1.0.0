import { useState, type FormEvent } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../components/layout/MainLayout';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { Spinner } from '../../../components/ui/Spinner';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../i18n';
import { useAuthActions } from '../hooks/useAuthActions';
import { validate, required, minLength, passwordsMatch } from '../../../utils/validators';

export function ChangePasswordPage() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const { changePassword } = useAuthActions();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const next: Record<string, string> = {};

    const curErr = validate(currentPassword, required);
    if (curErr) next.current = curErr;

    const newErr = validate(newPassword, required, (v) => minLength(v, 6));
    if (newErr) next.new = newErr;

    const confirmErr = validate(confirmPassword, required);
    if (confirmErr) next.confirm = confirmErr;
    else {
      const matchErr = passwordsMatch(newPassword, confirmPassword);
      if (matchErr) next.confirm = matchErr;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess(false);
    if (!validateForm() || !session) return;

    setLoading(true);
    try {
      const ok = await changePassword(session.userId, currentPassword, newPassword);
      if (ok) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setFormError(t.auth.changePasswordWrongCurrent);
      }
    } catch {
      setFormError(t.auth.changePasswordWrongCurrent);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.common.back}
        </button>

        <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-white">
          {t.auth.changePasswordTitle}
        </h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          {t.auth.changePasswordSubtitle}
        </p>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-desk-sm dark:border-slate-700 dark:bg-slate-800">
          {success && (
            <Alert variant="success" className="mb-4">
              {t.auth.changePasswordSuccess}
            </Alert>
          )}
          {formError && (
            <Alert variant="error" className="mb-4">
              {formError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
              <Input
                type="password"
                label={t.auth.changePasswordCurrent}
                name="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={errors.current}
                className="pl-10"
                autoComplete="current-password"
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
              <Input
                type="password"
                label={t.auth.changePasswordNew}
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={errors.new}
                className="pl-10"
                hint="At least 6 characters"
                autoComplete="new-password"
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
              <Input
                type="password"
                label={t.auth.changePasswordConfirm}
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirm}
                className="pl-10"
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? <Spinner size="sm" /> : t.auth.changePasswordButton}
            </Button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Lock, HelpCircle } from 'lucide-react';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { Spinner } from '../../../components/ui/Spinner';
import { useLanguage } from '../../../i18n';
import { useAuthActions } from '../hooks/useAuthActions';
import { validate, required, minLength, passwordsMatch } from '../../../utils/validators';

type Step = 'username' | 'question' | 'done';

export function ForgotPasswordForm() {
  const { t } = useLanguage();
  const { getSecurityQuestion, resetPassword } = useAuthActions();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoadQuestion = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const err = validate(username, required);
    if (err) {
      setErrors({ username: err });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const q = await getSecurityQuestion(username);
      if (!q) {
        setFormError(t.auth.forgotUserNotFound);
      } else {
        setQuestion(q);
        setStep('question');
      }
    } catch {
      setFormError(t.auth.forgotNoQuestion);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const next: Record<string, string> = {};

    const answerErr = validate(answer, required, (v) => minLength(v, 2));
    if (answerErr) next.answer = answerErr;

    const pwdErr = validate(newPassword, required, (v) => minLength(v, 6));
    if (pwdErr) next.password = pwdErr;

    const confirmErr = validate(confirmPassword, required);
    if (confirmErr) next.confirmPassword = confirmErr;
    else {
      const matchErr = passwordsMatch(newPassword, confirmPassword);
      if (matchErr) next.confirmPassword = matchErr;
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const ok = await resetPassword(username, answer, newPassword);
      if (ok) {
        setStep('done');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setFormError(t.auth.forgotWrongAnswer);
      }
    } catch {
      setFormError(t.auth.forgotWrongAnswer);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <AuthLayout title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle}>
        <Alert variant="success">{t.auth.forgotSuccess}</Alert>
      </AuthLayout>
    );
  }

  if (step === 'username') {
    return (
      <AuthLayout title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle}>
        <form onSubmit={handleLoadQuestion} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.auth.forgotUsername}
              error={errors.username}
              className="pl-10"
              autoFocus
            />
          </div>

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? <Spinner size="sm" /> : t.auth.forgotLoadQuestion}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {t.auth.backToLogin}
            </Link>
          </div>
        </form>
      </AuthLayout>
    );
  }

  // step === 'question'
  return (
    <AuthLayout title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle}>
      <form onSubmit={handleReset} className="space-y-4">
        {formError && <Alert variant="error">{formError}</Alert>}

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.auth.forgotQuestionLabel}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{question}</p>
        </div>

        <div className="relative">
          <HelpCircle className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
          <Input
            label={t.auth.forgotAnswer}
            name="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            error={errors.answer}
            className="pl-10"
            autoFocus
          />
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
          <Input
            type="password"
            label={t.auth.forgotNewPassword}
            name="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.password}
            className="pl-10"
            hint="At least 6 characters"
          />
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
          <Input
            type="password"
            label={t.auth.forgotConfirmPassword}
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            className="pl-10"
          />
        </div>

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? <Spinner size="sm" /> : t.auth.forgotResetButton}
        </Button>

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {t.auth.backToLogin}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Lock, Phone, HelpCircle } from 'lucide-react';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { Spinner } from '../../../components/ui/Spinner';
import { useLanguage } from '../../../i18n';
import { useAuthActions } from '../hooks/useAuthActions';
import { validate, required, minLength, maxLength, isPhone, passwordsMatch } from '../../../utils/validators';

const SECURITY_QUESTIONS = [
  'What is the name of your first pet?',
  'What is the name of your primary school?',
  'What is your favorite food?',
  'In what city were you born?',
];

export function SetupForm() {
  const { t } = useLanguage();
  const { createInitialAccount } = useAuthActions();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const next: Record<string, string> = {};

    const nameErr = validate(fullName, required, (v) => minLength(v, 2));
    if (nameErr) next.fullName = nameErr;

    const userErr = validate(username, required, (v) => minLength(v, 3), (v) => maxLength(v, 30));
    if (userErr) next.username = userErr;

    if (phone.trim()) {
      const phoneErr = isPhone(phone);
      if (phoneErr) next.phone = phoneErr;
    }

    const pwdErr = validate(password, required, (v) => minLength(v, 6));
    if (pwdErr) next.password = pwdErr;

    const confirmErr = validate(confirmPassword, required);
    if (confirmErr) next.confirmPassword = confirmErr;
    else {
      const matchErr = passwordsMatch(password, confirmPassword);
      if (matchErr) next.confirmPassword = matchErr;
    }

    const answerErr = validate(securityAnswer, required, (v) => minLength(v, 2));
    if (answerErr) next.securityAnswer = answerErr;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      await createInitialAccount({
        fullName,
        username,
        phone,
        password,
        securityQuestion,
        securityAnswer,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title={t.auth.setupTitle} subtitle={t.auth.setupSubtitle}>
        <Alert variant="success">{t.auth.setupSuccess}</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t.auth.setupTitle} subtitle={t.auth.setupSubtitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && <Alert variant="error">{submitError}</Alert>}

        <div className="relative">
          <UserIcon className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
          <Input
            label={t.auth.setupFullName}
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
            className="pl-10"
          />
        </div>

        <div className="relative">
          <UserIcon className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
          <Input
            label={t.auth.setupUsername}
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            className="pl-10"
            hint="At least 3 characters"
          />
        </div>

        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
          <Input
            label={t.auth.setupPhone}
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            className="pl-10"
            placeholder="+250..."
          />
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
          <Input
            type="password"
            label={t.auth.setupPassword}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            className="pl-10"
            hint="At least 6 characters"
          />
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
          <Input
            type="password"
            label={t.auth.setupConfirmPassword}
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            className="pl-10"
          />
        </div>

        <div className="relative">
          <HelpCircle className="pointer-events-none absolute left-3 top-[2.4rem] z-10 h-5 w-5 text-slate-400" />
          <Input
            label={t.auth.setupSecurityQuestion}
            name="securityQuestion"
            value={securityQuestion}
            onChange={(e) => setSecurityQuestion(e.target.value)}
            error={errors.securityQuestion}
            className="pl-10"
          />
        </div>

        <Input
          label={t.auth.setupSecurityAnswer}
          name="securityAnswer"
          value={securityAnswer}
          onChange={(e) => setSecurityAnswer(e.target.value)}
          error={errors.securityAnswer}
        />

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? <Spinner size="sm" /> : t.auth.setupButton}
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

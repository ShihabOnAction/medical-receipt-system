import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User, Phone, BriefcaseBusiness, UserPlus, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { registerSchema } from '../../utils/validation.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../context/ToastContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import cn from '../../utils/cn.js';

/** Simple strength meter - guidance only, the rules live in the schema. */
function strengthOf(password = '') {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = ['bg-state-danger', 'bg-state-danger', 'bg-state-warning', 'bg-state-info', 'bg-state-success'];

export function Register() {
  useDocumentTitle('Request an account');
  const { register: registerAccount } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', designation: '', password: '', confirmPassword: '' },
  });

  const password = watch('password') || '';
  const score = strengthOf(password);

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await registerAccount(values);
      toast.success('An administrator will review your request shortly.', 'Registration received');
      navigate('/pending', { replace: true, state: { justRegistered: true, email: values.email } });
    } catch (error) {
      if (error.details && typeof error.details === 'object') {
        for (const [field, message] of Object.entries(error.details)) {
          setError(field, { type: 'server', message });
        }
      }
      toast.error(error.message || 'Could not complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Request an account</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Accounts are activated by the department administrator before first use.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Input
          label="Full name"
          placeholder="Md. Rakibul Hasan"
          icon={User}
          required
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="Gmail address"
          type="email"
          placeholder="you@gmail.com"
          icon={Mail}
          required
          autoComplete="username"
          hint="Only @gmail.com addresses are accepted."
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Phone" placeholder="01XXXXXXXXX" icon={Phone} error={errors.phone?.message} {...register('phone')} />
          <Input
            label="Designation"
            placeholder="Counter assistant"
            icon={BriefcaseBusiness}
            error={errors.designation?.message}
            {...register('designation')}
          />
        </div>

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            icon={Lock}
            required
            autoComplete="new-password"
            error={errors.password?.message}
            actions={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex items-center gap-1 text-xs text-ink-subtle transition hover:text-ink"
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            }
            {...register('password')}
          />
          {password ? (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={cn('h-1 flex-1 rounded-full transition-colors', index < score ? COLORS[score] : 'bg-line')}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-subtle">Strength: {LABELS[score]}</p>
            </div>
          ) : null}
        </div>

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          icon={Lock}
          required
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div className="flex gap-2 rounded-md bg-surface-sunken p-3 text-xs text-ink-muted">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
          <p>
            Your account starts as <b>pending</b>. You will be able to issue receipts as soon as an administrator
            approves it.
          </p>
        </div>

        <Button type="submit" size="lg" fullWidth icon={UserPlus} loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="link">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default Register;

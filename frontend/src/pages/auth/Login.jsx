import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { loginSchema } from '../../utils/validation.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../context/ToastContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export function Login() {
  useDocumentTitle('Sign in');
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const profile = await signIn(values);

      if (!profile) {
        navigate('/pending', { replace: true });
        return;
      }
      if (profile.status !== 'APPROVED') {
        navigate('/pending', { replace: true });
        return;
      }

      const target =
        location.state?.from && location.state.from !== '/login'
          ? location.state.from
          : profile.role === 'ADMIN'
            ? '/admin/dashboard'
            : '/staff/dashboard';

      toast.success(`Welcome back, ${profile.fullName.split(' ')[0]}.`, 'Signed in');
      navigate(target, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Could not sign you in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">Use the account approved by your administrator.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Input
          label="E-mail"
          type="email"
          autoComplete="username"
          placeholder="you@gmail.com"
          icon={Mail}
          required
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          icon={Lock}
          required
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

        <div className="flex justify-end">
          <Link to="/forgot-password" className="link text-sm">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth icon={LogIn} loading={submitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        New to the department?{' '}
        <Link to="/register" className="link">
          Request an account
        </Link>
      </p>
    </div>
  );
}

export default Login;

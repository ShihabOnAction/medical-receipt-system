import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, ArrowLeft, MailCheck } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { sendPasswordReset } from '../../services/auth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export function ForgotPassword() {
  useDocumentTitle('Reset password');
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (error) {
      toast.error(error.message || 'Could not send the reset e-mail.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-state-success/10 text-state-success">
          <MailCheck size={28} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-ink">Check your inbox</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          If an account exists for <b>{email}</b>, a password reset link is on its way. The link expires in one hour.
        </p>
        <Link to="/login" className="mt-6 inline-block">
          <Button variant="secondary" icon={ArrowLeft}>
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-muted">We will e-mail you a link to choose a new one.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label="E-mail"
          type="email"
          required
          icon={Mail}
          placeholder="you@gmail.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" size="lg" fullWidth icon={Send} loading={sending}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link to="/login" className="link">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default ForgotPassword;

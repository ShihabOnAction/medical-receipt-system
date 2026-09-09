import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { updatePassword } from '../../services/auth.js';
import { supabase } from '../../lib/supabase.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

/**
 * Landing page for the Supabase recovery link. The link puts the token in
 * the URL fragment, so it is exchanged for a session before anything else.
 */
export function ResetPassword() {
  useDocumentTitle('Choose a new password');
  const toast = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.slice(1));
      supabase.auth
        .setSession({
          access_token: params.get('access_token'),
          refresh_token: params.get('refresh_token'),
        })
        .then(() => setReady(true))
        .catch(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) return setError('Use at least 8 characters.');
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return setError('Include at least one letter and one number.');
    if (password !== confirm) return setError('Passwords do not match.');

    setSaving(true);
    try {
      await updatePassword(password);
      toast.success('Sign in with your new password.', 'Password updated');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not update the password. Request a new link.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Choose a new password</h1>
      <p className="mt-1 text-sm text-ink-muted">At least 8 characters, with a letter and a number.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label="New password"
          type="password"
          icon={Lock}
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Input
          label="Confirm new password"
          type="password"
          icon={Lock}
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={error}
        />
        <Button type="submit" size="lg" fullWidth icon={KeyRound} loading={saving} disabled={!ready}>
          Update password
        </Button>
      </form>
    </div>
  );
}

export default ResetPassword;

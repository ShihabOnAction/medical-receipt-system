import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Clock, RefreshCw, LogOut, ShieldAlert, Ban, MailCheck } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../context/ToastContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const STATES = {
  PENDING: {
    icon: Clock,
    tone: 'text-state-warning bg-state-warning/10',
    title: 'Waiting for approval',
    message:
      'Your registration reached the administrator. As soon as the account is approved you will be able to sign in and issue receipts.',
  },
  REJECTED: {
    icon: Ban,
    tone: 'text-state-danger bg-state-danger/10',
    title: 'Registration rejected',
    message: 'The administrator did not approve this account. Please contact the department office if you think this is a mistake.',
  },
  SUSPENDED: {
    icon: ShieldAlert,
    tone: 'text-state-danger bg-state-danger/10',
    title: 'Account suspended',
    message: 'This account has been suspended. Contact the department administrator to have it restored.',
  },
};

export function PendingApproval() {
  useDocumentTitle('Account status');
  const { user, status, isApproved, isAdmin, refreshProfile, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  // An account approved while this page was open must not be stranded here.
  if (isApproved) return <Navigate to={isAdmin ? '/admin/dashboard' : '/staff/dashboard'} replace />;

  const state = STATES[status] || STATES.PENDING;
  const Icon = state.icon;

  const check = async () => {
    setChecking(true);
    try {
      const profile = await refreshProfile();
      if (profile?.status === 'APPROVED') {
        toast.success('Your account is active.', 'Approved');
        navigate(profile.role === 'ADMIN' ? '/admin/dashboard' : '/staff/dashboard', { replace: true });
      } else {
        toast.info('Still waiting for the administrator.');
      }
    } catch {
      toast.error('Could not check your status right now.');
    } finally {
      setChecking(false);
    }
  };

  const leave = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="text-center">
      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${state.tone}`}>
        <Icon size={28} />
      </div>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">{state.title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">{state.message}</p>

      {user?.email ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-sunken px-3 py-1.5 text-sm text-ink-muted">
          <MailCheck size={15} className="text-brand-600" />
          {user.email}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {status !== 'REJECTED' ? (
          <Button icon={RefreshCw} loading={checking} onClick={check}>
            Check again
          </Button>
        ) : null}
        <Button variant="secondary" icon={LogOut} onClick={leave}>
          Sign out
        </Button>
      </div>

      <p className="mt-8 text-xs text-ink-subtle">
        Approval is done from Admin → Staff &amp; access. Nothing you enter is lost while you wait.
      </p>
    </div>
  );
}

export default PendingApproval;

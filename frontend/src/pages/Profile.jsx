import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Save, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import { Card, CardHeader, PageHeader } from '../components/ui/Card.jsx';
import { StatusBadge, RoleBadge } from '../components/ui/Badge.jsx';
import { profileSchema } from '../utils/validation.js';
import { formatDateTime } from '../utils/formatDate.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../context/ToastContext.jsx';
import { updatePassword } from '../services/auth.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

export function Profile() {
  useDocumentTitle('My profile');
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changing, setChanging] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName ?? '', phone: user?.phone ?? '', designation: user?.designation ?? '' },
  });

  useEffect(() => {
    reset({ fullName: user?.fullName ?? '', phone: user?.phone ?? '', designation: user?.designation ?? '' });
  }, [user, reset]);

  const save = async (values) => {
    setSaving(true);
    try {
      await updateProfile(values);
      toast.success('Your details were updated.');
    } catch (error) {
      toast.error(error.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      toast.error('Use at least 8 characters, with a letter and a number.');
      return;
    }
    if (password !== confirm) {
      toast.error('The two passwords do not match.');
      return;
    }
    setChanging(true);
    try {
      await updatePassword(password);
      setPassword('');
      setConfirm('');
      toast.success('Your password was changed.');
    } catch (error) {
      toast.error(error.message || 'Could not change the password.');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div>
      <PageHeader title="My profile" subtitle="Your details as they appear on receipts and in the audit log." />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader icon={User} title="Details" />
          <form onSubmit={handleSubmit(save)} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              className="sm:col-span-2"
              hint="This is the name printed as “Prepared by”."
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
            <Input label="Designation" error={errors.designation?.message} {...register('designation')} />
            <div className="sm:col-span-2">
              <Button type="submit" icon={Save} loading={saving} disabled={!isDirty}>
                Save details
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader icon={ShieldCheck} title="Account" />
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-subtle">E-mail</dt>
                <dd className="flex items-center gap-1.5 truncate font-medium text-ink">
                  <Mail size={13} className="text-ink-subtle" />
                  {user?.email}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-subtle">Role</dt>
                <dd>
                  <RoleBadge role={user?.role} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-subtle">Status</dt>
                <dd>
                  <StatusBadge status={user?.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-subtle">Member since</dt>
                <dd className="font-medium text-ink">{formatDateTime(user?.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader icon={KeyRound} title="Change password" subtitle="At least 8 characters, a letter and a number." />
            <form onSubmit={changePassword} className="mt-4 space-y-3">
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
              <Button type="submit" variant="secondary" icon={KeyRound} loading={changing} disabled={!password}>
                Update password
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Profile;

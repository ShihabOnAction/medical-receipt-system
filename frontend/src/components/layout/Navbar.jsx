import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, ChevronDown, FilePlus2, ShieldCheck } from 'lucide-react';
import cn from '../../utils/cn.js';
import Button from '../ui/Button.jsx';
import { RoleBadge } from '../ui/Badge.jsx';
import ThemeMenu from './ThemeMenu.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import useClickOutside from '../../hooks/useClickOutside.js';
import { useToast } from '../../context/ToastContext.jsx';

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function Navbar({ onMenuClick, title }) {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  useClickOutside(ref, () => setOpen(false), open);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line glass no-print">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-ink-muted transition hover:bg-surface-sunken hover:text-ink lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{title}</p>
        </div>

        <Link to="/staff/receipts/create" className="hidden sm:block">
          <Button size="sm" icon={FilePlus2}>
            New Receipt
          </Button>
        </Link>

        <ThemeMenu />

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md p-1 pr-2 text-left transition hover:bg-surface-sunken"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full brand-gradient text-xs font-semibold text-white">
              {initials(user?.fullName) || <User size={15} />}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[9rem] truncate text-sm font-medium text-ink">{user?.fullName}</span>
              <span className="block text-[0.68rem] text-ink-subtle">{isAdmin ? 'Administrator' : 'Staff'}</span>
            </span>
            <ChevronDown size={15} className={cn('text-ink-subtle transition', open && 'rotate-180')} />
          </button>

          {open ? (
            <div className="absolute right-0 z-40 mt-2 w-60 animate-slide-up overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
              <div className="border-b border-line px-4 py-3">
                <p className="truncate text-sm font-semibold text-ink">{user?.fullName}</p>
                <p className="truncate text-xs text-ink-subtle">{user?.email}</p>
                <div className="mt-2">
                  <RoleBadge role={user?.role} />
                </div>
              </div>
              <div className="p-1">
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-muted transition hover:bg-surface-sunken hover:text-ink"
                >
                  <User size={16} /> My profile
                </Link>
                {isAdmin ? (
                  <Link
                    to="/admin/settings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-muted transition hover:bg-surface-sunken hover:text-ink"
                  >
                    <ShieldCheck size={16} /> Hospital settings
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-state-danger transition hover:bg-state-danger/10"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Navbar;

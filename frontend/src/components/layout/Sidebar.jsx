import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  ReceiptText,
  Users,
  FlaskConical,
  Settings as SettingsIcon,
  ScrollText,
  X,
} from 'lucide-react';
import cn from '../../utils/cn.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';

const STAFF_NAV = [
  { to: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/staff/receipts/create', label: 'New Receipt', icon: FilePlus2 },
  { to: '/staff/receipts', label: 'My Receipts', icon: ReceiptText },
];

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/receipts', label: 'Receipts', icon: ReceiptText },
  { to: '/admin/users', label: 'Staff & Access', icon: Users },
  { to: '/admin/tests', label: 'Tests & Prices', icon: FlaskConical },
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/admin/audit-logs', label: 'Audit Log', icon: ScrollText },
];

export function Sidebar({ open, onClose }) {
  const { settings } = useSettings();
  const { isAdmin } = useAuth();

  const groups = isAdmin
    ? [
        { title: 'Administration', items: ADMIN_NAV },
        { title: 'Counter', items: STAFF_NAV },
      ]
    : [{ title: 'Counter', items: STAFF_NAV }];

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] lg:hidden no-print" onClick={onClose} aria-hidden="true" />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform duration-200 lg:translate-x-0 no-print',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          <img
            src={settings.logoUrl || '/logo.png'}
            alt=""
            className="h-10 w-10 shrink-0 rounded object-contain"
            onError={(event) => {
              event.currentTarget.style.visibility = 'hidden';
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-ink">{settings.hospitalName}</p>
            <p className="truncate text-xs text-ink-subtle">{settings.departmentName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-subtle hover:bg-surface-sunken lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-subtle">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                          isActive
                            ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                            : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              'h-5 w-0.5 rounded-full transition-colors',
                              isActive ? 'bg-brand-600' : 'bg-transparent'
                            )}
                          />
                          <item.icon size={18} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3">
          <p className="text-[0.68rem] leading-relaxed text-ink-subtle">
            {settings.hospitalName}
            <br />
            Money receipt system · v1.0
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

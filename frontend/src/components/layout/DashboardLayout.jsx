import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';

const TITLES = [
  [/^\/staff\/dashboard/, 'Dashboard'],
  [/^\/staff\/receipts\/create/, 'Create receipt'],
  [/^\/staff\/receipts\/[^/]+$/, 'Receipt details'],
  [/^\/staff\/receipts/, 'My receipts'],
  [/^\/admin\/dashboard/, 'Admin dashboard'],
  [/^\/admin\/receipts\/[^/]+$/, 'Receipt details'],
  [/^\/admin\/receipts/, 'All receipts'],
  [/^\/admin\/users/, 'Staff & access'],
  [/^\/admin\/tests/, 'Tests & prices'],
  [/^\/admin\/settings/, 'Hospital settings'],
  [/^\/admin\/audit-logs/, 'Audit log'],
  [/^\/profile/, 'My profile'],
];

export function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the drawer whenever the route changes on mobile.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const title = TITLES.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? 'Medical Receipt System';

  return (
    <div className="min-h-screen bg-surface-sunken">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-64">
        <Navbar onMenuClick={() => setMenuOpen(true)} title={title} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;

import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

export function NotFound() {
  useDocumentTitle('Page not found');
  const { isAuthenticated, isAdmin, isApproved } = useAuth();

  const home = !isAuthenticated ? '/login' : !isApproved ? '/pending' : isAdmin ? '/admin/dashboard' : '/staff/dashboard';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-sunken px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-ink-subtle shadow-card">
        <FileQuestion size={28} />
      </div>
      <h1 className="mt-5 text-3xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        The address you opened does not exist. It may have been renamed, or the link is out of date.
      </p>
      <Link to={home} className="mt-6">
        <Button icon={Home}>Go back</Button>
      </Link>
    </div>
  );
}

export default NotFound;

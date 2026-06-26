import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const hasLocalAuth = Boolean(localStorage.getItem('cc_auth'));

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-slate text-sm">Connecting to UiPath…</div>;
  }

  if (isAuthenticated) {
    localStorage.setItem('cc_auth', '1');
  }

  if (!hasLocalAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthed = Boolean(localStorage.getItem('cc_auth'));
  if (!isAuthed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

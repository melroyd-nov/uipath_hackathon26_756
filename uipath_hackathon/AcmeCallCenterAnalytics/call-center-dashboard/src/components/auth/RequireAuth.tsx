import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthed = Boolean(localStorage.getItem('cc_auth'));
  const { isAuthenticated, isLoading, error, login } = useAuth();

  if (!isAuthed) return <Navigate to="/login" replace />;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-slate text-sm">Connecting to UiPath…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="app-texture flex h-screen flex-col items-center justify-center gap-4 bg-canvas">
        <div className="w-full max-w-sm rounded-card border border-silver bg-paper p-8 text-center shadow-card">
          <h2 className="font-editorial text-2xl text-obsidian">Connect to UiPath</h2>
          <p className="mt-2 text-sm text-slate">
            Sign in with your UiPath account to load live call center data from Data Fabric.
          </p>
          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
          <button
            type="button"
            onClick={login}
            className="mt-6 w-full rounded-button bg-obsidian px-4 py-2 text-sm font-medium text-paper shadow-subtle transition-colors hover:bg-graphite"
          >
            Sign in with UiPath
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

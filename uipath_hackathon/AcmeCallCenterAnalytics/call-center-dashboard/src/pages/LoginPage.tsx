import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headset, Mail, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated, error: uiPathError } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('cc_auth', '1');
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="app-texture flex h-screen bg-canvas">
      <div className="hidden w-1/2 flex-col justify-between bg-graphite p-10 lg:flex">
        <span className="font-editorial text-xl text-white">n.</span>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1 text-xs font-medium text-lilac-bloom">
            <Headset size={13} />
            Call Center Analytics
          </span>
          <h1 className="mt-4 max-w-sm font-editorial text-4xl leading-tight text-white">
            Your live queue, sentiment, and follow-ups in one view.
          </h1>
          <p className="mt-3 max-w-sm text-sm text-gray-400">
            Monitor calls, agents, and compliance signals as they happen across every line.
          </p>
        </div>
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} Acme Call Center Analytics</p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm rounded-card border border-silver bg-paper p-8 shadow-card">
          <span className="rounded-badge bg-lilac-bloom px-3 py-1 text-xs font-medium text-obsidian lg:hidden">
            Call Center Analytics
          </span>
          <h2 className="mt-4 font-editorial text-3xl text-obsidian lg:mt-0">Welcome back</h2>
          <p className="mt-1 text-sm text-slate">Sign in to monitor your live queue</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-graphite">Email</label>
              <div className="flex items-center gap-2 rounded-input border border-silver bg-bone px-3 py-2 opacity-50">
                <Mail size={15} className="text-slate" />
                <input
                  type="email"
                  disabled
                  placeholder="you@acme.com"
                  className="w-full bg-transparent text-sm text-obsidian outline-none placeholder:text-slate cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-graphite">Password</label>
              <div className="flex items-center gap-2 rounded-input border border-silver bg-bone px-3 py-2 opacity-50">
                <Lock size={15} className="text-slate" />
                <input
                  type="password"
                  disabled
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-obsidian outline-none placeholder:text-slate cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="button"
              disabled
              className="mt-2 w-full rounded-button bg-obsidian px-4 py-2 text-sm font-medium text-paper shadow-subtle opacity-50 cursor-not-allowed"
            >
              Sign in
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-silver" />
            <span className="text-xs text-slate">or</span>
            <span className="h-px flex-1 bg-silver" />
          </div>

          {uiPathError && (
            <p className="mt-3 text-center text-xs text-red-600">{uiPathError}</p>
          )}

          <button
            type="button"
            onClick={() => login()}
            disabled={isLoading}
            className="mt-4 w-full rounded-button border border-silver bg-bone px-4 py-2 text-sm font-medium text-obsidian transition-colors hover:bg-silver disabled:opacity-50"
          >
            {isLoading ? 'Connecting…' : 'Continue with UiPath'}
          </button>
        </div>
      </div>
    </div>
  );
}

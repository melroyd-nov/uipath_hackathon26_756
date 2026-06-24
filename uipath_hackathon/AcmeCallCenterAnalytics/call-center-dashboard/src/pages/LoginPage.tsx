import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headset, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cc_auth', '1');
    navigate('/');
  };

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

          <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-graphite">
                Email
              </label>
              <div className="flex items-center gap-2 rounded-input border border-silver bg-bone px-3 py-2 focus-within:border-graphite">
                <Mail size={15} className="text-slate" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@acme.com"
                  className="w-full bg-transparent text-sm text-obsidian outline-none placeholder:text-slate"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-graphite">
                Password
              </label>
              <div className="flex items-center gap-2 rounded-input border border-silver bg-bone px-3 py-2 focus-within:border-graphite">
                <Lock size={15} className="text-slate" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-obsidian outline-none placeholder:text-slate"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-button bg-obsidian px-4 py-2 text-sm font-medium text-paper shadow-subtle transition-colors hover:bg-graphite"
            >
              Sign in
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate">Demo build — any credentials will sign you in.</p>
        </div>
      </div>
    </div>
  );
}

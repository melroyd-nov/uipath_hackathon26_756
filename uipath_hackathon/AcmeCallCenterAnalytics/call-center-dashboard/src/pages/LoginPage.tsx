import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleSignIn = () => {
    localStorage.setItem('cc_auth', '1');
    navigate('/');
  };

  return (
    <div className="flex h-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-sm rounded-card border border-silver bg-paper p-8 shadow-card">
        <span className="rounded-badge bg-lilac-bloom px-3 py-1 text-xs font-medium text-obsidian">
          Call Center Analytics
        </span>
        <h1 className="mt-4 font-editorial text-3xl text-obsidian">Welcome back</h1>
        <p className="mt-1 text-sm text-slate">Sign in to monitor your live queue</p>
        <button
          type="button"
          onClick={handleSignIn}
          className="mt-6 w-full rounded-button bg-obsidian px-4 py-2 text-sm font-medium text-paper shadow-subtle transition-colors hover:bg-graphite"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}

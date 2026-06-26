import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trash2, Moon, Sun, LogOut } from 'lucide-react';
import { NAV_ITEMS } from '../../config/navigation';
import { useAuth } from '../../hooks/useAuth';
import { ARIA_BRIEF_CACHE_KEY } from '../../hooks/useAriaBrief';

function derivePageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const exact = NAV_ITEMS.find((item) => item.path === pathname);
  if (exact) return exact.label;
  const prefixMatch = NAV_ITEMS.filter((item) => item.path !== '/' && pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return prefixMatch?.label ?? 'Call Center Analytics';
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout: uiPathLogout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('cc_theme') as 'light' | 'dark') ?? 'light',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('cc_theme', theme);
  }, [theme]);

  const clearAiCache = () => {
    const AI_PREFIXES = ['ai_cache_v1_', 'ai_cmd_v3_'];
    Object.keys(localStorage)
      .filter((key) => AI_PREFIXES.some((p) => key.startsWith(p)))
      .forEach((key) => localStorage.removeItem(key));
  };

  const logout = () => {
    uiPathLogout();
    localStorage.removeItem('cc_auth');
    sessionStorage.removeItem(ARIA_BRIEF_CACHE_KEY);
    navigate('/login');
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="flex h-14 items-center justify-between border-b border-silver bg-paper px-6">
      <h1 className="font-editorial text-lg text-obsidian">{derivePageTitle(location.pathname)}</h1>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-pill bg-status-live-bg px-3 py-1 text-xs font-medium text-status-live">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          Data Fabric
        </span>

        <span className="text-xs text-slate">{today}</span>

        <button
          type="button"
          onClick={clearAiCache}
          title="Clear AI insight cache"
          className="rounded-button p-1.5 text-slate hover:bg-bone hover:text-obsidian"
        >
          <Trash2 size={16} />
        </button>

        <button
          type="button"
          onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          title="Toggle theme"
          className="rounded-button p-1.5 text-slate hover:bg-bone hover:text-obsidian"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <span className="rounded-pill bg-lilac-bloom px-3 py-1 text-xs font-medium text-obsidian">Admin</span>

        <button
          type="button"
          onClick={logout}
          title="Logout"
          className="rounded-button p-1.5 text-slate hover:bg-bone hover:text-obsidian"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

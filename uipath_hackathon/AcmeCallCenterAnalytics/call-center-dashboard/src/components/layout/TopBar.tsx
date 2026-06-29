import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trash2, LogOut, Bell } from 'lucide-react';
import { NAV_ITEMS } from '../../config/navigation';
import { useAuth } from '../../hooks/useAuth';
import { ARIA_BRIEF_CACHE_KEY } from '../../hooks/useAriaBrief';
import uiPathIcon from '../../public/UiPath-Icon.png';

function deriveNavItem(pathname: string) {
  if (pathname === '/') return NAV_ITEMS[0];
  const exact = NAV_ITEMS.find((i) => i.path === pathname);
  if (exact) return exact;
  return (
    NAV_ITEMS.filter((i) => i.path !== '/' && pathname.startsWith(i.path))
      .sort((a, b) => b.path.length - a.path.length)[0] ?? NAV_ITEMS[0]
  );
}

function IconBtn({
  icon: Icon,
  title,
  onClick,
  danger = false,
  badge = false,
}: {
  icon: typeof Trash2;
  title: string;
  onClick?: () => void;
  danger?: boolean;
  badge?: boolean;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        title={title}
        onClick={onClick}
        className={`group flex h-8 w-8 items-center justify-center rounded-lg border border-transparent transition-all duration-150 ${
          danger
            ? 'hover:border-red-100 hover:bg-red-50'
            : 'hover:border-indigo-100 hover:bg-indigo-50'
        }`}
      >
        <Icon
          size={14}
          className={`transition-colors duration-150 ${
            danger
              ? 'text-[#9CA3AF] group-hover:text-[#D31F37]'
              : 'text-[#9CA3AF] group-hover:text-[#6366F1]'
          }`}
        />
      </button>
      {badge && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 h-[5px] w-[5px] rounded-full bg-indigo-500" />
      )}
    </div>
  );
}

function Divider() {
  return <div className="h-5 w-px shrink-0 bg-[rgba(15,31,76,0.08)]" />;
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout: uiPathLogout } = useAuth();
  const navItem = deriveNavItem(location.pathname);
  const Icon = navItem?.icon;

  const clearAiCache = () => {
    ['ai_cache_v1_', 'ai_cmd_v3_'].forEach((prefix) =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix))
        .forEach((k) => localStorage.removeItem(k)),
    );
  };

  const logout = () => {
    uiPathLogout();
    localStorage.removeItem('cc_auth');
    sessionStorage.removeItem(ARIA_BRIEF_CACHE_KEY);
    navigate('/login');
  };

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header
      className="flex h-[58px] shrink-0 items-center justify-between border-b border-[rgba(15,31,76,0.07)] bg-white/90 px-5 backdrop-blur-md"
    >
      {/* ── Left: page icon + title + powered by ── */}
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #4F46E5, #2563EB)',
                boxShadow: '0 2px 8px rgba(79,70,229,0.28)',
              }}
            >
              <Icon size={15} color="white" />
            </div>
            <div>
              <h1
                className="text-[14.5px] font-semibold leading-none tracking-[-0.015em] text-[#0F1F4C]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {navItem?.label ?? 'Call Center Analytics'}
              </h1>
              <p className="mt-[3px] text-[9.5px] font-medium uppercase tracking-[0.10em] text-[rgba(15,31,76,0.30)]">
                Acme Call Center Analytics
              </p>
            </div>
          </div>
        )}

        <Divider />

        {/* Powered by UiPath pill */}
        <div className="flex items-center gap-1.5 rounded-full border border-[rgba(15,31,76,0.08)] bg-[rgba(15,31,76,0.03)] px-3 pt-1.5 pb-1">
          <span className="text-[11px] font-medium leading-none text-[rgba(15,31,76,0.40)]">
            Powered by
          </span>
          <img
            src={uiPathIcon}
            alt="UiPath"
            className="h-[16px] w-auto object-contain -translate-y-[3px]"
          />
        </div>
      </div>

      {/* ── Right: time + actions + avatar ── */}
      <div className="flex items-center gap-1.5">
        <div className="mr-2 hidden flex-col items-end sm:flex">
          <span
            className="text-[12.5px] font-medium leading-none text-[#374151]"
            style={{ fontFamily: 'Fira Code, monospace' }}
          >
            {time}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-[#9CA3AF]">
            {date}
          </span>
        </div>

        <Divider />

        <IconBtn icon={Trash2} title="Clear AI insight cache" onClick={clearAiCache} />
        <IconBtn icon={Bell} title="Notifications" badge />
        <IconBtn icon={LogOut} title="Logout" onClick={logout} danger />

        <Divider />

        {/* Avatar */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{
            fontFamily: 'Poppins, sans-serif',
            background: 'linear-gradient(135deg, #4F46E5, #2563EB)',
            boxShadow: '0 1px 4px rgba(79,70,229,0.30)',
          }}
        >
          A
        </div>
      </div>
    </header>
  );
}

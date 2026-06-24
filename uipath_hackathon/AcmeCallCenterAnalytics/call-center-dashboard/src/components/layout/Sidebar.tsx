import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { NAV_ITEMS } from '../../config/navigation';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r border-silver bg-blush transition-all ${
        collapsed ? 'w-12' : 'w-48'
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-silver bg-blush text-graphite transition-colors hover:bg-black/10 hover:text-obsidian dark:hover:bg-white/10"
      >
        <ChevronLeft size={14} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-visible">
        <div className="flex shrink-0 items-center gap-3 border-b border-black/10 px-4 py-4 dark:border-white/10">
          <span className={`font-editorial text-obsidian ${collapsed ? 'text-base' : 'text-xl'}`}>n.</span>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-visible pt-1 pb-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `group relative mx-1.5 flex items-center gap-2.5 rounded-lg px-2.5 transition-colors ${
                    collapsed ? 'py-2.5 text-sm' : 'py-2 text-[13px]'
                  } ${
                    isActive
                      ? 'bg-black/10 text-obsidian dark:bg-white/10'
                      : 'text-graphite/70 hover:bg-black/5 hover:text-obsidian dark:hover:bg-white/5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className={`shrink-0 ${isActive ? 'text-obsidian' : 'text-graphite/50'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

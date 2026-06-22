import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { NAV_ITEMS } from '../../config/navigation';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r border-silver bg-blush transition-all ${
        collapsed ? 'w-16' : 'w-48'
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-silver bg-blush text-graphite transition-colors hover:bg-black/10 hover:text-obsidian"
      >
        <ChevronLeft size={14} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-black/10 px-4 py-4">
          <span className={`font-editorial text-obsidian ${collapsed ? 'text-base' : 'text-xl'}`}>n.</span>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-hidden pt-1 pb-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `mx-1.5 flex items-center gap-2.5 rounded-lg px-2.5 transition-colors ${
                    collapsed ? 'py-2.5 text-sm' : 'py-2 text-[13px]'
                  } ${isActive ? 'bg-black/10 text-obsidian' : 'text-graphite/70 hover:bg-black/5 hover:text-obsidian'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className={`shrink-0 ${isActive ? 'text-obsidian' : 'text-graphite/50'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
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

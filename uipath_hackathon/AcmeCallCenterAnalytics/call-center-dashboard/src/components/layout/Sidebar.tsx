import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { NAV_ITEMS } from '../../config/navigation';
import AiUsageBadge from '../ai/AiUsageBadge';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col overflow-hidden border-r border-silver bg-obsidian transition-all ${
        collapsed ? 'w-16' : 'w-48'
      }`}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-4">
        <span className={`font-editorial text-white ${collapsed ? 'text-base' : 'text-xl'}`}>n.</span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-hidden py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `mx-1.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={`shrink-0 ${isActive ? 'text-lilac-bloom' : 'text-gray-500'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <AiUsageBadge collapsed={collapsed} />

      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="mx-3 mb-3 flex h-9 shrink-0 items-center gap-2 rounded-lg px-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-100"
      >
        <ChevronLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        {!collapsed && <span className="text-xs">Collapse</span>}
      </button>
    </aside>
  );
}

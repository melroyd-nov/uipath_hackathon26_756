import { NavLink } from 'react-router-dom';
import { navGroups } from '../../config/navigation';

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center px-6 text-lg font-semibold text-slate-900">
        Call Center
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

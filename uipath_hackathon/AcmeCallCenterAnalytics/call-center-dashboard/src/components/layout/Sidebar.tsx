import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { NAV_ITEMS } from '../../config/navigation';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r border-white/[0.07] transition-all duration-200 ${
        collapsed ? 'w-12' : 'w-48'
      }`}
      style={{
        background: 'linear-gradient(180deg, #2A1A8C 0%, #1C1060 35%, #140C50 70%, #100940 100%)',
        boxShadow: '4px 0 24px rgba(20,12,80,0.30)',
        zIndex: 10,
      }}
    >
      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-6 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#1C1060] text-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.30)] transition-colors hover:bg-[#2A1A8C] hover:text-white"
      >
        <ChevronLeft size={13} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-visible">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-white/[0.08] px-3 py-4">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.70), rgba(59,130,246,0.60))',
              boxShadow: '0 0 12px rgba(99,102,241,0.40)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            <span className="text-xs font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>A</span>
          </div>
          {!collapsed && (
            <span
              className="truncate text-[12px] font-semibold text-white/80"
              style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.01em' }}
            >
              Call Center
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex min-h-0 flex-1 flex-col overflow-visible pt-1 pb-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `group relative mx-1.5 flex items-center gap-2.5 rounded-xl transition-all duration-150 ${
                    collapsed ? 'justify-center py-2.5 px-2' : 'py-2 px-2.5'
                  } ${
                    isActive
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/[0.07]'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.28), rgba(59,130,246,0.18))',
                        boxShadow: '0 0 14px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
                        border: '1px solid rgba(99,102,241,0.28)',
                      }
                    : {}
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={15}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      className={`shrink-0 transition-colors ${isActive ? 'text-[#93C5FD]' : ''}`}
                    />
                    {!collapsed && (
                      <span className={`truncate text-[12.5px] font-medium ${isActive ? 'text-white' : ''}`}>
                        {item.label}
                      </span>
                    )}
                    {/* Active right-edge indicator */}
                    {isActive && (
                      <span className="absolute -right-[7px] top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-l-full bg-[#60A5FA]" />
                    )}
                    {/* Tooltip — only when collapsed */}
                    {collapsed && (
                      <span
                        className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.30)] transition-opacity duration-150 group-hover:opacity-100"
                        style={{ background: '#1C1060', border: '1px solid rgba(99,102,241,0.25)' }}
                      >
                        {item.label}
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1C1060]" />
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/[0.07] py-2 px-3">
        {!collapsed ? (
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/20">Powered by UiPath</p>
        ) : (
          <p className="text-center text-[7px] font-bold uppercase tracking-widest text-white/20">UI</p>
        )}
      </div>
    </aside>
  );
}

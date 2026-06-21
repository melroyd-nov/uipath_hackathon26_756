import { Info, Download } from 'lucide-react';
import type { ReactNode } from 'react';

interface GlassPanelProps {
  title?: string;
  subtitle?: string;
  tooltip?: string;
  onExport?: () => void;
  children: ReactNode;
  className?: string;
}

export default function GlassPanel({ title, subtitle, tooltip, onExport, children, className = '' }: GlassPanelProps) {
  return (
    <section className={`rounded-card border border-silver bg-paper/80 p-6 shadow-card backdrop-blur-sm ${className}`}>
      {title && (
        <header className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-editorial text-lg text-obsidian">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                title="Export as CSV"
                className="flex items-center gap-1 rounded-pill border border-silver px-2.5 py-1 text-xs font-medium text-slate hover:text-obsidian"
              >
                <Download size={13} />
                Export
              </button>
            )}
            {tooltip && (
              <span title={tooltip} className="mt-0.5 text-mist hover:text-slate">
                <Info size={16} />
              </span>
            )}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

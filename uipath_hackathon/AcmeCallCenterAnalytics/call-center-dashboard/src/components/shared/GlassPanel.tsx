import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

interface GlassPanelProps {
  title?: string;
  subtitle?: string;
  tooltip?: string;
  children: ReactNode;
  className?: string;
}

export default function GlassPanel({ title, subtitle, tooltip, children, className = '' }: GlassPanelProps) {
  return (
    <section className={`rounded-card border border-silver bg-paper/80 p-6 shadow-card backdrop-blur-sm ${className}`}>
      {title && (
        <header className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-editorial text-lg text-obsidian">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate">{subtitle}</p>}
          </div>
          {tooltip && (
            <span title={tooltip} className="mt-0.5 shrink-0 text-mist hover:text-slate">
              <Info size={16} />
            </span>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

import type { LucideIcon } from 'lucide-react';
import { Info, ArrowUp, ArrowDown } from 'lucide-react';

export type KpiStatus = 'good' | 'watch' | 'critical' | 'neutral';

const ACCENT_STYLES: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  rose: 'bg-rose-50 text-rose-600',
  orange: 'bg-orange-50 text-orange-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
};

const STATUS_STYLES: Record<KpiStatus, string> = {
  good: 'bg-status-live-bg text-status-live',
  watch: 'bg-status-hold-bg text-status-hold',
  critical: 'bg-status-escalated-bg text-status-escalated',
  neutral: 'bg-bone text-graphite',
};

const STATUS_LABELS: Record<KpiStatus, string> = {
  good: 'Good',
  watch: 'Watch',
  critical: 'Critical',
  neutral: 'Neutral',
};

interface KpiHeroCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENT_STYLES;
  status: KpiStatus;
  benchmark?: string;
  footer?: string;
  tooltip?: string;
  sparkline?: number[];
  trend?: 'up' | 'down' | null;
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 60;
      const y = 18 - ((v - min) / range) * 18;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="60" height="18" viewBox="0 0 60 18" className="shrink-0">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function KpiHeroCard({
  label,
  value,
  icon: Icon,
  accent,
  status,
  benchmark,
  footer,
  tooltip,
  sparkline,
  trend,
}: KpiHeroCardProps) {
  return (
    <div className="rounded-card border border-silver bg-paper p-4 shadow-subtle">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-badge ${ACCENT_STYLES[accent]}`}>
          <Icon size={18} />
        </span>
        <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span className="truncate text-xs font-medium text-slate">{label}</span>
        {tooltip && (
          <span title={tooltip} className="shrink-0 text-slate hover:text-graphite">
            <Info size={12} />
          </span>
        )}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="truncate font-sans text-2xl font-semibold tracking-tight text-obsidian">{value}</span>
        {sparkline && sparkline.length > 1 && (
          <span className={`flex items-center gap-0.5 ${ACCENT_STYLES[accent].split(' ')[1]}`}>
            <Sparkline data={sparkline} />
            {trend && (trend === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-[11px] text-slate">{benchmark ?? footer}</p>
    </div>
  );
}

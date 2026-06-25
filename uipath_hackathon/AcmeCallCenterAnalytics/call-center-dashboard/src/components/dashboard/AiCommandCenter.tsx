import { TrendingUp, AlertCircle, Lightbulb, ThumbsUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import GlassPanel from '../shared/GlassPanel';
import AiOrbIcon from '../ai/AiOrbIcon';
import AiBadge from '../ai/AiBadge';
import type { KpiSummary } from '../../api/dashboard';

const SECTIONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'OVERALL PERFORMANCE', label: 'Overall Performance', icon: TrendingUp },
  { key: 'NEEDS ATTENTION', label: 'Needs Attention', icon: AlertCircle },
  { key: 'RECOMMENDED ACTION', label: 'Recommended Action', icon: Lightbulb },
  { key: 'POSITIVE SIGNAL', label: 'Positive Signal', icon: ThumbsUp },
];

export default function AiCommandCenter({ kpi: _kpi }: { kpi: KpiSummary | undefined }) {
  return (
    <GlassPanel>
      <header className="mb-4 flex items-center gap-3">
        <AiOrbIcon size={18} />
        <div>
          <h2 className="font-editorial text-lg text-obsidian">AI Analytics Brief</h2>
          <p className="text-sm text-slate">Generated from this period's KPI data</p>
        </div>
        <AiBadge label="Offline" variant="neutral" />
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-card border border-silver bg-paper p-4">
            <div className="mb-2 flex items-center gap-2">
              <Icon size={14} className="text-slate" />
              <span className="text-xs font-medium text-graphite">{label}</span>
            </div>
            <p className="text-sm text-slate italic">AI features require a connected backend.</p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

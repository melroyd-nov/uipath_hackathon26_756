import { TrendingUp, AlertCircle, Lightbulb, ThumbsUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import GlassPanel from '../shared/GlassPanel';
import AiOrbIcon from '../ai/AiOrbIcon';
import AiBadge from '../ai/AiBadge';
import type { KpiSummary } from '../../api/dashboard';
import { useAriaBrief, BRIEF_SECTION_KEYS, type BriefSectionKey } from '../../hooks/useAriaBrief';
import { useAuth } from '../../hooks/useAuth';

const SECTIONS: { key: BriefSectionKey; label: string; icon: LucideIcon }[] = [
  { key: 'OVERALL PERFORMANCE', label: 'Overall Performance', icon: TrendingUp },
  { key: 'NEEDS ATTENTION', label: 'Needs Attention', icon: AlertCircle },
  { key: 'RECOMMENDED ACTION', label: 'Recommended Action', icon: Lightbulb },
  { key: 'POSITIVE SIGNAL', label: 'Positive Signal', icon: ThumbsUp },
];

function CardSkeleton() {
  return (
    <div className="space-y-1.5 animate-pulse">
      <div className="h-3 w-full rounded bg-silver" />
      <div className="h-3 w-5/6 rounded bg-silver" />
      <div className="h-3 w-4/6 rounded bg-silver" />
    </div>
  );
}

export default function AiCommandCenter({ kpi }: { kpi: KpiSummary | undefined }) {
  const { isAuthenticated } = useAuth();
  const { sections, isLoading, error } = useAriaBrief({ kpi });

  const hasAny = BRIEF_SECTION_KEYS.some((k) => sections[k]);
  const badgeLabel = !isAuthenticated ? 'Offline' : isLoading ? 'Generating…' : hasAny ? 'Aria' : error ? 'Error' : 'Offline';
  const badgeVariant: 'live' | 'neutral' = hasAny ? 'live' : 'neutral';

  return (
    <GlassPanel>
      <header className="mb-4 flex items-center gap-3">
        <AiOrbIcon size={18} />
        <div>
          <h2 className="font-editorial text-lg text-obsidian">AI Analytics Brief</h2>
          <p className="text-sm text-slate">Generated from this period's KPI data</p>
        </div>
        <AiBadge label={badgeLabel} variant={badgeVariant} />
      </header>

      {error && !hasAny && (
        <p className="mb-3 text-xs text-red-500">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const text = sections[key];
          return (
            <div key={key} className="rounded-card border border-silver bg-paper p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icon size={14} className="text-slate" />
                <span className="text-xs font-medium text-graphite">{label}</span>
              </div>
              {text ? (
                <p className="text-sm text-obsidian leading-relaxed">{text}</p>
              ) : isLoading ? (
                <CardSkeleton />
              ) : (
                <p className="text-sm text-slate italic">Waiting for Aria…</p>
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

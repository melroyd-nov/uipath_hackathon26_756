import { TrendingUp, AlertCircle, Lightbulb, ThumbsUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import GlassPanel from '../shared/GlassPanel';
import AiOrbIcon from '../ai/AiOrbIcon';
import AiBadge from '../ai/AiBadge';
import type { KpiSummary } from '../../api/dashboard';
import { useAriaBrief, BRIEF_SECTION_KEYS, type BriefSectionKey } from '../../hooks/useAriaBrief';
import { useAuth } from '../../hooks/useAuth';

const SECTIONS: { key: BriefSectionKey; label: string; icon: LucideIcon; accent: string }[] = [
  { key: 'OVERALL PERFORMANCE', label: 'Overall Performance', icon: TrendingUp, accent: 'text-[#3B82F6]' },
  { key: 'NEEDS ATTENTION', label: 'Needs Attention', icon: AlertCircle, accent: 'text-[#D31F37]' },
  { key: 'RECOMMENDED ACTION', label: 'Recommended Action', icon: Lightbulb, accent: 'text-[#D97706]' },
  { key: 'POSITIVE SIGNAL', label: 'Positive Signal', icon: ThumbsUp, accent: 'text-[#10B981]' },
];

function CardSkeleton() {
  return (
    <div className="space-y-1.5 animate-pulse">
      <div className="h-2.5 w-full rounded-[4px] bg-[rgba(15,31,76,0.08)]" />
      <div className="h-2.5 w-5/6 rounded-[4px] bg-[rgba(15,31,76,0.06)]" />
      <div className="h-2.5 w-4/6 rounded-[4px] bg-[rgba(15,31,76,0.04)]" />
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
    <GlassPanel accent="#6366F1">
      <header className="mb-4 flex items-center gap-3">
        <AiOrbIcon size={20} />
        <div>
          <h2
            className="text-[14px] font-semibold tracking-[-0.01em] text-[#0F1F4C]"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            AI Analytics Brief
          </h2>
          <p className="text-[11px] text-[#6B7280]">Generated from this period's KPI data</p>
        </div>
        <AiBadge label={badgeLabel} variant={badgeVariant} />
      </header>

      {error && !hasAny && (
        <p className="mb-3 text-[11px] text-[#D31F37]">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map(({ key, label, icon: Icon, accent }) => {
          const text = sections[key];
          return (
            <div
              key={key}
              className="rounded-[11px] border border-[rgba(30,94,172,0.14)] p-4 hover:-translate-y-0.5 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(234,242,255,0.85) 0%, rgba(237,232,255,0.85) 55%, rgba(232,244,255,0.85) 100%)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 2px 10px rgba(30,94,172,0.08), inset 0 1px 0 rgba(255,255,255,0.80)',
              }}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <Icon size={13} className={accent} />
                <span
                  className="text-[10px] font-extrabold uppercase tracking-[0.12em]"
                  style={{
                    background: 'linear-gradient(90deg,#0F1F4C 0%,#1E5EAC 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {label}
                </span>
              </div>
              {text ? (
                <p className="text-[11px] leading-[1.6] text-[rgba(15,31,76,0.70)]">{text}</p>
              ) : isLoading ? (
                <CardSkeleton />
              ) : (
                <p className="text-[11px] italic text-[rgba(15,31,76,0.40)]">Waiting for Aria…</p>
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

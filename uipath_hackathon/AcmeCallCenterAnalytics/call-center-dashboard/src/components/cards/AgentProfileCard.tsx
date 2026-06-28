import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { AgentDetail } from '../../api/agents';
import { num } from '../../utils/num';

type Status = 'good' | 'warning' | 'bad' | 'neutral';

const AVATAR_GRADIENTS = [
  'from-emerald-500 to-emerald-600',
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-cyan-700',
];

const STATUS_DOT: Record<Status, string> = {
  good: 'bg-emerald-500',
  warning: 'bg-amber-500',
  bad: 'bg-red-500',
  neutral: 'bg-silver',
};

type BenchmarkKey = 'escalation_pct' | 'resolution_pct';

const BENCHMARKS: Record<BenchmarkKey, { bench: number; higherIsBetter: boolean }> = {
  escalation_pct: { bench: 10, higherIsBetter: false },
  resolution_pct: { bench: 80, higherIsBetter: true },
};

function benchmarkStatus(key: BenchmarkKey, value: number | null): Status {
  if (value === null) return 'neutral';
  const { bench, higherIsBetter } = BENCHMARKS[key];
  if (higherIsBetter) {
    if (value >= bench) return 'good';
    if (value >= bench * 0.85) return 'warning';
    return 'bad';
  } else {
    if (value <= bench) return 'good';
    if (value <= bench * 1.5) return 'warning';
    return 'bad';
  }
}

function formatPct(v: number | null): string {
  return v != null ? `${num(v).toFixed(1)}%` : '—';
}

function formatDuration(seconds: number | null): string {
  return seconds != null ? `${Math.round(num(seconds) / 60)}m` : '—';
}

interface KpiBadgeProps {
  label: string;
  value: string;
  status: Status;
  tooltip?: string;
}

function KpiBadge({ label, value, status, tooltip }: KpiBadgeProps) {
  return (
    <div className="group/tip relative flex flex-col items-center">
      <span className="text-obsidian font-semibold text-sm">{value}</span>
      <span className="text-slate text-xs">{label}</span>
      <span className={`w-1.5 h-1.5 rounded-full mt-1 ${STATUS_DOT[status]}`} />
      {tooltip && (
        <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-48 rounded-xl border border-silver bg-paper px-3 py-2 text-[11px] leading-relaxed text-graphite opacity-0 shadow-card transition-opacity duration-150 group-hover/tip:opacity-100">
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-silver bg-paper" />
          {tooltip}
        </div>
      )}
    </div>
  );
}

interface AgentProfileCardProps {
  agent: AgentDetail;
  colorIndex: number;
}

export default function AgentProfileCard({ agent, colorIndex }: AgentProfileCardProps) {
  const { profile, kpi, feedback } = agent;
  const firstName = profile.full_name.split(' ')[0].toLowerCase();
  const gradientClass = AVATAR_GRADIENTS[colorIndex % AVATAR_GRADIENTS.length];
  const avgRating =
    feedback.length > 0
      ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
      : null;

  return (
    <Link
      to={`/agents/${firstName}`}
      className="rounded-xl border border-silver bg-paper p-5 flex flex-col gap-4 hover:border-mist hover:scale-[1.01] transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shrink-0`}
        >
          <span className="text-white font-bold text-lg">{profile.avatar_initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-obsidian font-semibold text-sm truncate">{profile.full_name}</p>
          <p className="text-slate text-xs truncate">{profile.role}</p>
          <p className="text-slate text-xs">{profile.team}</p>
        </div>
        {avgRating !== null && (
          <div className="flex items-center gap-1 shrink-0 text-amber-600">
            <Star size={12} className="fill-current" />
            <span className="text-xs font-medium">{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2 py-3 border-y border-silver">
        <KpiBadge label="Calls" value={num(kpi.total_calls).toLocaleString()} status="neutral" tooltip="Total calls handled by this agent in the selected period." />
        <KpiBadge
          label="Esc %"
          value={formatPct(kpi.escalation_pct)}
          status={benchmarkStatus('escalation_pct', kpi.escalation_pct)}
          tooltip="Escalation rate — percentage of calls escalated to a supervisor. Target: ≤10%."
        />
        <KpiBadge
          label="Res %"
          value={formatPct(kpi.resolution_pct)}
          status={benchmarkStatus('resolution_pct', kpi.resolution_pct)}
          tooltip="First-call resolution rate — percentage of calls resolved without a follow-up. Target: ≥80%."
        />
        <KpiBadge label="Avg Dur" value={formatDuration(kpi.avg_duration_seconds)} status="neutral" tooltip="Average call duration for this agent. System target is 6.5 minutes (AHT)." />
      </div>

      {/* Certifications */}
      {profile.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.certifications.map((cert) => (
            <span key={cert} className="text-xs bg-bone text-slate px-2 py-0.5 rounded-md">
              {cert}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate">
        <span>{profile.experience_years} yrs exp</span>
        <span className="text-emerald-600 group-hover:text-emerald-700 transition-colors">View profile →</span>
      </div>
    </Link>
  );
}

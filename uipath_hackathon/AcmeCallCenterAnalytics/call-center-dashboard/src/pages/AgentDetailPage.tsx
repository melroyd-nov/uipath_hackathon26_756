import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star, Award, MessageSquare, Send } from 'lucide-react';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import AgentRadarChart from '../components/charts/AgentRadarChart';
import { useFilters } from '../context/FilterContext';
import { useDummyDataContext } from '../context/DummyDataContext';
import { agentsApi } from '../api/agents';
import type { NewFeedbackPayload } from '../api/agents';
import { mockAgents } from '../data/mockAgentsData';
import { num } from '../utils/num';

const AVATAR_NAMES = ['sam', 'john', 'david', 'mike', 'mary'];
const AVATAR_GRADIENTS = [
  'from-emerald-500 to-emerald-600',
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-cyan-700',
];

type Status = 'good' | 'warning' | 'bad' | 'neutral';

const BENCHMARKS = {
  escalation_pct:     { bench: 10, higherIsBetter: false },
  compliance_fail_pct:{ bench: 5,  higherIsBetter: false },
  resolution_pct:     { bench: 80, higherIsBetter: true  },
  preverified_pct:    { bench: 80, higherIsBetter: true  },
  trigger_word_pct:   { bench: 3,  higherIsBetter: false },
  repeat_call_pct:    { bench: 20, higherIsBetter: false },
} as const;

type BenchmarkKey = keyof typeof BENCHMARKS;

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

function sentimentStatus(v: number | null): Status {
  if (v === null) return 'neutral';
  if (v > 0.1) return 'good';
  if (v < -0.1) return 'bad';
  return 'warning';
}

const COLOR_MAP: Record<Status, string> = {
  good: 'text-emerald-600',
  warning: 'text-amber-600',
  bad: 'text-red-600',
  neutral: 'text-obsidian',
};

function formatPct(v: number | null): string {
  return v != null ? `${num(v).toFixed(1)}%` : '—';
}

function formatDuration(seconds: number | null): string {
  return seconds != null ? `${Math.round(num(seconds) / 60)}m` : '—';
}

interface KpiTileProps {
  label: string;
  value: string;
  status: Status;
}

function KpiTile({ label, value, status }: KpiTileProps) {
  return (
    <div className="rounded-xl border border-silver bg-bone p-4 text-center">
      <p className={`text-2xl font-bold ${COLOR_MAP[status]}`}>{value}</p>
      <p className="text-slate text-xs mt-1">{label}</p>
    </div>
  );
}

export default function AgentDetailPage() {
  const { name } = useParams<{ name: string }>();
  const { startDate, endDate } = useFilters();
  const { useDummyData } = useDummyDataContext();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<NewFeedbackPayload>({
    manager: '',
    rating: 5,
    comment: '',
  });

  const agentQuery = useQuery({
    queryKey: ['agent', name, startDate, endDate],
    queryFn: () =>
      agentsApi.get(name!, {
        start_date: startDate ?? undefined,
        end_date: endDate ?? undefined,
      }),
    enabled: !!name && !useDummyData,
  });

  const addFeedback = useMutation({
    mutationFn: (payload: NewFeedbackPayload) => agentsApi.addFeedback(name!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', name] });
      setFeedbackForm({ manager: '', rating: 5, comment: '' });
      setShowForm(false);
    },
  });

  const agent = useDummyData
    ? mockAgents.find((a) => a.profile.full_name.split(' ')[0].toLowerCase() === name)
    : agentQuery.data;

  const isLoading = !useDummyData && agentQuery.isLoading;

  const colorIdx = AVATAR_NAMES.indexOf(name?.toLowerCase() ?? '');
  const gradientClass = AVATAR_GRADIENTS[colorIdx >= 0 ? colorIdx : 0];
  const firstName = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-6">
        <Link
          to="/agents"
          className="flex items-center gap-1.5 text-sm text-slate hover:text-obsidian transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Back to Agents
        </Link>
        <EmptyState
          title="Agent not found"
          description={`No profile found for "${name}".`}
        />
      </div>
    );
  }

  const { profile, kpi, feedback } = agent;
  const avgRating =
    feedback.length > 0
      ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
      : null;

  const radarInsightData = {
    resolution_pct:      { value: kpi.resolution_pct ?? 0,                          benchmark: 80, note: 'higher is better' },
    preverified_pct:     { value: kpi.preverified_pct ?? 0,                          benchmark: 80, note: 'higher is better' },
    non_escalation_pct:  { value: Math.max(0, 100 - (kpi.escalation_pct ?? 0)),     benchmark: 90, note: 'higher is better (inverted from escalation rate)' },
    compliance_pass_pct: { value: Math.max(0, 100 - (kpi.compliance_fail_pct ?? 0)),benchmark: 95, note: 'higher is better (inverted from compliance fail rate)' },
    no_repeat_pct:       { value: Math.max(0, 100 - (kpi.repeat_call_pct ?? 0)),    benchmark: 80, note: 'higher is better (inverted from repeat call rate)' },
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        to="/agents"
        className="flex items-center gap-1.5 text-sm text-slate hover:text-obsidian transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Back to Agents
      </Link>

      <FilterBar />

      {/* Profile Header */}
      <div className="rounded-xl border border-silver bg-paper p-6 flex items-start gap-5">
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shrink-0`}
        >
          <span className="text-white font-bold text-2xl">{profile.avatar_initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-obsidian text-xl font-bold">{profile.full_name}</h1>
              <p className="text-slate text-sm">{profile.role} · {profile.team}</p>
              <p className="text-slate text-xs mt-0.5">
                Reports to: {profile.manager} · {profile.experience_years} years experience
              </p>
            </div>
            {avgRating !== null && (
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg shrink-0">
                <Star size={14} style={{ fill: '#D97706' }} className="text-amber-600" />
                <span className="text-amber-600 font-semibold text-sm">{avgRating.toFixed(1)}</span>
                <span className="text-slate text-xs">/ 5</span>
              </div>
            )}
          </div>
          {profile.certifications.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.certifications.map((cert) => (
                <span
                  key={cert}
                  className="text-xs bg-bone text-graphite px-2 py-1 rounded-md flex items-center gap-1"
                >
                  <Award size={11} className="text-emerald-600" />
                  {cert}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <KpiTile label="Total Calls" value={num(kpi.total_calls).toLocaleString()} status="neutral" />
        <KpiTile
          label="Avg Sentiment"
          value={kpi.avg_sentiment != null ? num(kpi.avg_sentiment).toFixed(2) : '—'}
          status={sentimentStatus(kpi.avg_sentiment)}
        />
        <KpiTile
          label="Escalation %"
          value={formatPct(kpi.escalation_pct)}
          status={benchmarkStatus('escalation_pct', kpi.escalation_pct)}
        />
        <KpiTile
          label="Compliance Fail %"
          value={formatPct(kpi.compliance_fail_pct)}
          status={benchmarkStatus('compliance_fail_pct', kpi.compliance_fail_pct)}
        />
        <KpiTile
          label="Resolution %"
          value={formatPct(kpi.resolution_pct)}
          status={benchmarkStatus('resolution_pct', kpi.resolution_pct)}
        />
        <KpiTile
          label="Pre-Verified %"
          value={formatPct(kpi.preverified_pct)}
          status={benchmarkStatus('preverified_pct', kpi.preverified_pct)}
        />
        <KpiTile
          label="Trigger Word %"
          value={formatPct(kpi.trigger_word_pct)}
          status={benchmarkStatus('trigger_word_pct', kpi.trigger_word_pct)}
        />
        <KpiTile label="Avg Duration" value={formatDuration(kpi.avg_duration_seconds)} status="neutral" />
      </div>

      {/* Radar + Feedback */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassPanel
          title="Performance Radar"
          subtitle="Green = agent · Dashed = benchmark"
          tooltip="Spider/radar chart comparing the agent across 5 KPIs: Resolution Rate, Pre-Verification, Non-Escalation, Compliance, and No Repeat. The brand-color solid shape is the agent's actual performance; the dashed amber shape shows the benchmark target. Gaps between the two highlight specific areas needing improvement."
        >
          <AgentRadarChart kpi={kpi} agentName={firstName} />
          <ChartInsight
            prompt={`Analyse the performance radar for agent ${firstName}. Which KPIs are below their benchmark, what are the strengths and weaknesses, and what specific coaching actions would improve performance? Data: ${JSON.stringify(radarInsightData)}`}
            cacheKey={`agent-radar-${name}-${startDate}-${endDate}`}
          />
        </GlassPanel>

        <GlassPanel title={`Manager Feedback (${feedback.length})`}>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {feedback.length === 0 ? (
              <EmptyState title="No feedback yet" />
            ) : (
              feedback.map((f, idx) => (
                <div key={idx} className="bg-bone rounded-lg p-3 border border-silver">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-obsidian text-xs font-medium">{f.manager}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, s) => (
                        <Star
                          key={s}
                          size={11}
                          style={{ fill: s < f.rating ? '#D97706' : 'transparent' }}
                          className={s < f.rating ? 'text-amber-600' : 'text-silver'}
                        />
                      ))}
                    </div>
                    <span className="text-slate text-xs">{f.date}</span>
                  </div>
                  <p className="text-slate text-xs leading-relaxed mt-1">{f.comment}</p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-silver pt-4 mt-4">
            {!showForm ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 text-emerald-600 text-xs hover:text-emerald-700 transition-colors"
              >
                <MessageSquare size={13} /> Add feedback
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Manager name"
                  value={feedbackForm.manager}
                  onChange={(e) =>
                    setFeedbackForm((prev) => ({ ...prev, manager: e.target.value }))
                  }
                  className="w-full bg-paper border border-silver rounded-lg px-3 py-2 text-obsidian text-xs placeholder-slate focus:border-emerald-500 focus:outline-none"
                />
                <select
                  value={feedbackForm.rating}
                  onChange={(e) =>
                    setFeedbackForm((prev) => ({ ...prev, rating: Number(e.target.value) }))
                  }
                  className="w-full bg-paper border border-silver rounded-lg px-3 py-2 text-obsidian text-xs focus:border-emerald-500 focus:outline-none"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={3}
                  placeholder="Add a comment…"
                  value={feedbackForm.comment}
                  onChange={(e) =>
                    setFeedbackForm((prev) => ({ ...prev, comment: e.target.value }))
                  }
                  className="w-full bg-paper border border-silver rounded-lg px-3 py-2 text-obsidian text-xs placeholder-slate focus:border-emerald-500 focus:outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={() => addFeedback.mutate(feedbackForm)}
                  disabled={useDummyData || !feedbackForm.manager || !feedbackForm.comment || addFeedback.isPending}
                  title={useDummyData ? 'Feedback cannot be saved while viewing demo data' : undefined}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={11} />
                  {addFeedback.isPending ? 'Saving…' : 'Submit'}
                </button>
                {useDummyData && (
                  <p className="text-slate text-xs">Feedback can't be saved while viewing demo data.</p>
                )}
                {addFeedback.isError && (
                  <p className="text-red-600 text-xs">Failed to save feedback — check that the backend is reachable.</p>
                )}
              </div>
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PhoneCall,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  Zap,
  RefreshCw,
  Info,
  Crown,
} from 'lucide-react';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import KpiHeroCard, { type KpiStatus } from '../components/dashboard/KpiHeroCard';
import HealthGauge from '../components/dashboard/HealthGauge';
import AiCommandCenter from '../components/dashboard/AiCommandCenter';
import FollowupStatusWidget from '../components/dashboard/FollowupStatusWidget';
import AiOrbIcon from '../components/ai/AiOrbIcon';
import CallVolumeTrendChart from '../components/charts/CallVolumeTrendChart';
import AvgHandleTimeChart from '../components/charts/AvgHandleTimeChart';
import { useFilters } from '../context/FilterContext';
import { useDummyDataContext } from '../context/DummyDataContext';
import { getKpiSummary, getKpiTrends, getAgentSummary, type KpiSummary } from '../api/dashboard';
import { mockKpiSummary, mockKpiTrends, mockAgentSummary } from '../data/mockDashboardData';
import { num } from '../utils/num';

function benchmarkFor(kpi: KpiSummary, key: string, fallback: number): number {
  const benchmarks = kpi.benchmarks as Record<string, number> | undefined;
  return benchmarks?.[key] ?? fallback;
}

function computeHealthScore(kpi: KpiSummary): number {
  const resolution = num(kpi.resolution_pct);
  const escalation = num(kpi.escalation_pct);
  const complianceFail = num(kpi.compliance_fail_pct);
  const repeatCall = num(kpi.repeat_call_pct);
  const avgSentiment = num(kpi.avg_sentiment);

  let score = 50;
  score += Math.max(0, resolution - 70) * 0.5;
  score -= Math.max(0, escalation - 10) * 1.5;
  score -= Math.max(0, complianceFail - 5) * 2;
  score -= Math.max(0, repeatCall - 15) * 0.8;
  score += avgSentiment * 15;

  return Math.max(0, Math.min(100, score));
}

function HealthScoreInfo() {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info size={14} className="text-slate hover:text-graphite" />
      {show && (
        <div className="absolute right-0 top-6 z-20 w-64 rounded-card border border-silver bg-paper p-3 text-xs text-graphite shadow-card">
          <p className="font-medium text-obsidian">Health Score formula</p>
          <p className="mt-1">
            Starts at 50: +0.5/% resolution above 70, −1.5/% escalation above 10, −2/% compliance-fail
            above 5, −0.8/% repeat-call above 15, +15× avg sentiment.
          </p>
          <p className="mt-2 text-slate">75+ Healthy · 50–74 Attention · &lt;50 Critical</p>
        </div>
      )}
    </span>
  );
}

function CompactRing({ value, size = 40, color = '#6366F1' }: { value: number; size?: number; color?: string }) {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#d6d6d6" strokeWidth={4} />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.28} fill="#333333">
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}

function statusFor(value: number, goodAt: number, watchAt: number, direction: 'higher' | 'lower'): KpiStatus {
  if (direction === 'higher') {
    if (value >= goodAt) return 'good';
    if (value >= watchAt) return 'watch';
    return 'critical';
  }
  if (value <= goodAt) return 'good';
  if (value <= watchAt) return 'watch';
  return 'critical';
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const HEALTH_METRICS = [
  { key: 'resolution_pct', label: 'Resolution', icon: CheckCircle, direction: 'higher', benchmarkKey: 'resolution_pct', fallback: 80, color: '#34D399' },
  { key: 'escalation_pct', label: 'Escalation', icon: AlertTriangle, direction: 'lower', benchmarkKey: 'escalation_pct', fallback: 10, color: '#F59E0B' },
  { key: 'compliance_fail_pct', label: 'Compliance', icon: ShieldCheck, direction: 'lower', benchmarkKey: 'compliance_fail_pct', fallback: 5, color: '#6366F1' },
  { key: 'repeat_call_pct', label: 'Repeat Calls', icon: RefreshCw, direction: 'lower', benchmarkKey: 'repeat_call_pct', fallback: 20, color: '#EC4899' },
] as const;

export default function DashboardPage() {
  const { startDate, endDate, agentFilter } = useFilters();
  const filters = { start_date: startDate, end_date: endDate, agent: agentFilter };
  const { useDummyData } = useDummyDataContext();

  const { data: querySummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary', filters],
    queryFn: () => getKpiSummary(filters),
    enabled: !useDummyData,
  });

  const { data: queryKpiTrends } = useQuery({
    queryKey: ['dashboard-kpi-trends', filters],
    queryFn: () => getKpiTrends(filters),
    enabled: !useDummyData,
  });

  const { data: queryAgentSummary } = useQuery({
    queryKey: ['dashboard-agent-summary', filters],
    queryFn: () => getAgentSummary(filters),
    enabled: !useDummyData,
  });

  const summary = useDummyData ? mockKpiSummary : querySummary;
  const kpiTrends = useDummyData ? mockKpiTrends : queryKpiTrends;
  const agentSummary = useDummyData ? mockAgentSummary : queryAgentSummary;

  const trendSeries = (key: string) => (kpiTrends ?? []).map((t) => num(t[key]));

  const kpiCards = summary
    ? [
        {
          label: 'Total Calls',
          value: num(summary.total_calls).toLocaleString(),
          icon: PhoneCall,
          accent: 'indigo' as const,
          status: 'neutral' as KpiStatus,
          footer: 'All recorded calls',
          sparkline: trendSeries('total_calls'),
        },
        {
          label: 'Resolution',
          value: `${num(summary.resolution_pct).toFixed(1)}%`,
          icon: CheckCircle,
          accent: 'emerald' as const,
          status: statusFor(num(summary.resolution_pct), 80, 68, 'higher'),
          benchmark: `≥${benchmarkFor(summary, 'resolution_pct', 80)}%`,
          sparkline: trendSeries('resolution_pct'),
        },
        {
          label: 'Sentiment',
          value: num(summary.avg_sentiment).toFixed(2),
          icon: TrendingUp,
          accent: 'sky' as const,
          status: (num(summary.avg_sentiment) > 0.1
            ? 'good'
            : num(summary.avg_sentiment) < -0.1
              ? 'critical'
              : 'watch') as KpiStatus,
          footer:
            num(summary.avg_sentiment) > 0.1
              ? 'Positive trend'
              : num(summary.avg_sentiment) < -0.1
                ? 'Negative trend'
                : 'Neutral trend',
        },
        {
          label: 'Escalation',
          value: `${num(summary.escalation_pct).toFixed(1)}%`,
          icon: AlertTriangle,
          accent: 'rose' as const,
          status: statusFor(num(summary.escalation_pct), 10, 15, 'lower'),
          benchmark: `≤${benchmarkFor(summary, 'escalation_pct', 10)}%`,
          sparkline: trendSeries('escalation_pct'),
        },
        {
          label: 'Compliance Fail',
          value: `${num(summary.compliance_fail_pct).toFixed(1)}%`,
          icon: ShieldCheck,
          accent: 'orange' as const,
          status: statusFor(num(summary.compliance_fail_pct), 5, 8, 'lower'),
          benchmark: `≤${benchmarkFor(summary, 'compliance_fail_pct', 5)}%`,
          sparkline: trendSeries('compliance_fail_pct'),
        },
        {
          label: 'Pre-Verified',
          value: `${num(summary.pre_verified_pct).toFixed(1)}%`,
          icon: UserCheck,
          accent: 'cyan' as const,
          status: statusFor(num(summary.pre_verified_pct), 80, 68, 'higher'),
          benchmark: `≥${benchmarkFor(summary, 'pre_verified_pct', 80)}%`,
        },
        {
          label: 'Trigger Words',
          value: `${num(summary.trigger_words_pct).toFixed(1)}%`,
          icon: Zap,
          accent: 'amber' as const,
          status: statusFor(num(summary.trigger_words_pct), 3, 5, 'lower'),
          benchmark: `≤${benchmarkFor(summary, 'trigger_words_pct', 3)}%`,
        },
        {
          label: 'Repeat Calls',
          value: `${num(summary.repeat_call_pct).toFixed(1)}%`,
          icon: RefreshCw,
          accent: 'violet' as const,
          status: statusFor(num(summary.repeat_call_pct), 20, 30, 'lower'),
          benchmark: `≤${benchmarkFor(summary, 'repeat_call_pct', 20)}%`,
          sparkline: trendSeries('repeat_call_pct'),
        },
      ]
    : [];

  const healthScore = summary ? computeHealthScore(summary) : 0;
  const metricsOnTarget = summary
    ? HEALTH_METRICS.filter((m) => {
        const value = num(summary[m.key]);
        const bench = benchmarkFor(summary, m.benchmarkKey, m.fallback);
        return m.direction === 'higher' ? value >= bench : value <= bench;
      }).length
    : 0;

  const topAgents = [...(agentSummary ?? [])]
    .sort((a, b) => num(b.resolution_pct) - num(a.resolution_pct))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <FilterBar />

      {(summaryLoading && !useDummyData) || !summary ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <>
          <section className="rounded-card-elevated border border-silver bg-paper/80 p-6 shadow-card backdrop-blur-sm">
            <header className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="font-editorial text-2xl text-obsidian">{greeting()}!</h1>
                <p className="mt-0.5 text-sm text-slate">Here's how the call center is performing.</p>
              </div>
              <span className="rounded-pill bg-bone px-3 py-1 text-xs font-medium text-graphite">
                {startDate && endDate ? `${startDate} → ${endDate}` : 'All time'}
              </span>
            </header>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpiCards.slice(0, 4).map((card) => (
                <KpiHeroCard key={card.label} {...card} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpiCards.slice(4, 8).map((card) => (
                <KpiHeroCard key={card.label} {...card} />
              ))}
            </div>
          </section>

          <AiCommandCenter kpi={summary} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <GlassPanel className="lg:col-span-4">
              <header className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AiOrbIcon size={16} />
                  <h2 className="font-editorial text-lg text-obsidian">Health Score</h2>
                </div>
                <HealthScoreInfo />
              </header>
              <HealthGauge score={healthScore} size={160} />
              <p className="mt-2 text-center text-sm text-slate">{metricsOnTarget}/4 metrics on target</p>
              <div className="mt-4 space-y-3">
                {HEALTH_METRICS.map((m) => {
                  const value = num(summary[m.key]);
                  const bench = benchmarkFor(summary, m.benchmarkKey, m.fallback);
                  const onTarget = m.direction === 'higher' ? value >= bench : value <= bench;
                  const widthPct = Math.min(100, value);
                  return (
                    <div key={m.key}>
                      <div className="mb-1 flex items-center justify-between text-xs text-graphite">
                        <span className="flex items-center gap-1.5">
                          <m.icon size={12} className={onTarget ? 'text-status-live' : 'text-status-escalated'} />
                          {m.label}
                        </span>
                        <span>{value.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-pill bg-bone">
                        <div
                          className="h-1.5 rounded-pill"
                          style={{ width: `${widthPct}%`, backgroundColor: m.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>

            <GlassPanel className="lg:col-span-8">
              <header className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-editorial text-lg text-obsidian">Top Performers</h2>
                <Link to="/agents" className="text-sm text-slate hover:text-obsidian">
                  View all
                </Link>
              </header>

              {topAgents.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate">No agent data for this period.</p>
              ) : (
                <>
                  {topAgents.length >= 3 && (
                    <div className="mb-6 flex items-end justify-center gap-4">
                      {[topAgents[1], topAgents[0], topAgents[2]].map((agent, i) => {
                        const isFirst = agent === topAgents[0];
                        const podiumHeight = isFirst ? 'h-24' : i === 0 ? 'h-16' : 'h-12';
                        const avatarSize = isFirst ? 'h-20 w-20' : 'h-16 w-16';
                        const avatarPx = isFirst ? 80 : 64;
                        return (
                          <div key={agent.agent} className="flex flex-col items-center gap-2">
                            {isFirst && <Crown size={16} className="text-status-hold" />}
                            <img
                              src={`https://i.pravatar.cc/${avatarPx}?u=${encodeURIComponent(agent.agent)}`}
                              alt={agent.agent}
                              className={`${avatarSize} rounded-full border-2 border-paper shadow-subtle object-cover`}
                            />
                            <span className="max-w-[80px] truncate text-xs font-medium text-obsidian">
                              {agent.agent}
                            </span>
                            <div className={`w-16 rounded-t-badge bg-bone ${podiumHeight}`} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-slate">
                        <th className="pb-2">#</th>
                        <th className="pb-2">Agent</th>
                        <th className="pb-2">Resolution</th>
                        <th className="pb-2">Escalation</th>
                        <th className="pb-2">Compliance</th>
                        <th className="pb-2">Sentiment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topAgents.map((agent, i) => (
                        <tr key={agent.agent} className="border-t border-silver">
                          <td className="py-2 text-slate">{i + 1}</td>
                          <td className="py-2">
                            <Link to={`/agents/${encodeURIComponent(agent.agent)}`} className="font-medium text-obsidian hover:underline">
                              {agent.agent}
                            </Link>
                            <span className="ml-1 text-xs text-slate">({agent.call_count})</span>
                          </td>
                          <td className="py-2">
                            <div className="h-1.5 w-20 rounded-pill bg-bone">
                              <div
                                className="h-1.5 rounded-pill bg-emerald-500"
                                style={{ width: `${Math.min(100, num(agent.resolution_pct))}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-2">
                            <span className="rounded-pill bg-status-escalated-bg px-2 py-0.5 text-xs text-status-escalated">
                              {num(agent.escalation_pct).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2">
                            <CompactRing value={100 - num(agent.compliance_fail_pct)} size={32} />
                          </td>
                          <td className="py-2">
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  num(agent.avg_sentiment) > 0.1
                                    ? 'bg-status-live'
                                    : num(agent.avg_sentiment) < -0.1
                                      ? 'bg-status-escalated'
                                      : 'bg-status-hold'
                                }`}
                              />
                              {num(agent.avg_sentiment).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </GlassPanel>
          </div>
        </>
      )}

      <FollowupStatusWidget />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassPanel title="Monthly Call Volume">
          <CallVolumeTrendChart data={kpiTrends ?? []} />
          <ChartInsight
            prompt={`Given this monthly call volume trend: ${JSON.stringify(kpiTrends ?? [])}, give one short insight about the pattern.`}
            cacheKey={`call-volume-${JSON.stringify(filters)}`}
          />
        </GlassPanel>
        <GlassPanel title="Avg Handle Time">
          <AvgHandleTimeChart data={kpiTrends ?? []} />
          <ChartInsight
            prompt={`Given this monthly average handle time trend: ${JSON.stringify(kpiTrends ?? [])}, give one short insight about the pattern.`}
            cacheKey={`avg-handle-time-${JSON.stringify(filters)}`}
          />
        </GlassPanel>
      </div>
    </div>
  );
}

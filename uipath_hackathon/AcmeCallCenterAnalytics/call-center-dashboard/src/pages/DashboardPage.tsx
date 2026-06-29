import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
import lottieHealth from '../assets/lottie/icon-pulse.json';
import lottieTrophy from '../assets/lottie/icon-star.json';
import lottieBars from '../assets/lottie/icon-bars.json';
import lottieClock from '../assets/lottie/icon-clock.json';
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
import { useDataFabric } from '../lib/dataFabric';
import { getDfKpiSummary, getDfKpiTrends, getDfAgentSummary } from '../api/dataFabricQueries';
import type { KpiSummary } from '../api/dashboard';
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
  const strokeWidth = size < 36 ? 3 : 4;
  const radius = size / 2 - strokeWidth - 1;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#d6d6d6" strokeWidth={strokeWidth} />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.26} fill="#333333">
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
  { key: 'resolution_pct', label: 'First Call Resolution', icon: CheckCircle, direction: 'higher', benchmarkKey: 'resolution_pct', fallback: 80, color: '#34D399' },
  { key: 'escalation_pct', label: 'Escalation', icon: AlertTriangle, direction: 'lower', benchmarkKey: 'escalation_pct', fallback: 10, color: '#F59E0B' },
  { key: 'compliance_fail_pct', label: 'Compliance', icon: ShieldCheck, direction: 'lower', benchmarkKey: 'compliance_fail_pct', fallback: 5, color: '#6366F1' },
  { key: 'repeat_call_pct', label: 'Repeat Calls', icon: RefreshCw, direction: 'lower', benchmarkKey: 'repeat_call_pct', fallback: 20, color: '#EC4899' },
] as const;

export default function DashboardPage() {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const { startDate, endDate } = useFilters();
  const { entities } = useDataFabric();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['df-dashboard-summary'],
    queryFn: () => getDfKpiSummary(entities),
  });

  const { data: kpiTrends } = useQuery({
    queryKey: ['df-kpi-trends'],
    queryFn: () => getDfKpiTrends(entities),
  });

  const { data: agentSummary } = useQuery({
    queryKey: ['df-agent-summary'],
    queryFn: () => getDfAgentSummary(entities),
  });

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
          tooltip: 'Total number of calls processed in the selected period, across all agents and call types. Used as the denominator for all percentage-based KPIs.',
        },
        {
          label: 'First Call Resolution',
          value: `${num(summary.resolution_pct).toFixed(1)}%`,
          icon: CheckCircle,
          accent: 'emerald' as const,
          status: statusFor(num(summary.resolution_pct), 80, 68, 'higher'),
          benchmark: `≥${benchmarkFor(summary, 'resolution_pct', 80)}%`,
          sparkline: trendSeries('resolution_pct'),
          tooltip: 'Percentage of calls where the customer\'s issue was fully resolved on the first contact, without requiring a follow-up call. Target: ≥80%. Sustained dips below 68% are flagged as critical.',
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
          tooltip: 'Average customer sentiment score across all calls, derived from transcript and audio analysis. Range: −1.0 (very negative) to +1.0 (very positive). Above +0.1 is on track; below −0.1 is critical.',
        },
        {
          label: 'Escalation',
          value: `${num(summary.escalation_pct).toFixed(1)}%`,
          icon: AlertTriangle,
          accent: 'rose' as const,
          status: statusFor(num(summary.escalation_pct), 10, 15, 'lower'),
          benchmark: `≤${benchmarkFor(summary, 'escalation_pct', 10)}%`,
          sparkline: trendSeries('escalation_pct'),
          tooltip: 'Percentage of calls escalated to a supervisor or senior agent. Lower is better. Target: ≤10%. Above 15% is critical and may indicate insufficient agent training or a surge in complex cases.',
        },
        {
          label: 'Compliance Fail',
          value: `${num(summary.compliance_fail_pct).toFixed(1)}%`,
          icon: ShieldCheck,
          accent: 'orange' as const,
          status: statusFor(num(summary.compliance_fail_pct), 5, 8, 'lower'),
          benchmark: `≤${benchmarkFor(summary, 'compliance_fail_pct', 5)}%`,
          sparkline: trendSeries('compliance_fail_pct'),
          tooltip: 'Percentage of calls with at least one compliance rule failure (e.g. missing disclosure, prohibited phrasing). Target: ≤5%. Any sustained breach warrants immediate review and refresher training.',
        },
        {
          label: 'Pre-Verified',
          value: `${num(summary.pre_verified_pct).toFixed(1)}%`,
          icon: UserCheck,
          accent: 'cyan' as const,
          status: statusFor(num(summary.pre_verified_pct), 80, 68, 'higher'),
          benchmark: `≥${benchmarkFor(summary, 'pre_verified_pct', 80)}%`,
          tooltip: 'Percentage of callers successfully identity-verified before the agent engages on account details. Higher is better. Target: ≥80%. Low rates increase fraud risk and regulatory exposure.',
        },
        {
          label: 'Trigger Words',
          value: `${num(summary.trigger_words_pct).toFixed(1)}%`,
          icon: Zap,
          accent: 'amber' as const,
          status: statusFor(num(summary.trigger_words_pct), 3, 5, 'lower'),
          benchmark: `≤${benchmarkFor(summary, 'trigger_words_pct', 3)}%`,
          tooltip: 'Percentage of calls containing flagged trigger words such as "cancel", "lawyer", "complaint", or "refund". Lower is better. Target: ≤3%. Spikes may signal a product issue or external event.',
        },
        {
          label: 'Repeat Calls',
          value: `${num(summary.repeat_call_pct).toFixed(1)}%`,
          icon: RefreshCw,
          accent: 'violet' as const,
          status: statusFor(num(summary.repeat_call_pct), 20, 30, 'lower'),
          benchmark: `≤${benchmarkFor(summary, 'repeat_call_pct', 20)}%`,
          sparkline: trendSeries('repeat_call_pct'),
          tooltip: 'Percentage of calls where the same customer called back within 7 days for the same issue, indicating the first call did not fully resolve their concern. Lower is better. Target: ≤20%.',
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
    .sort((a, b) => num(b.resolution_pct) - num(a.resolution_pct));

  return (
    <div className="space-y-6">
      <FilterBar />

      {summaryLoading || !summary ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="relative overflow-hidden rounded-[20px] p-6"
            style={{
              background: 'rgba(255,255,255,0.80) padding-box, linear-gradient(135deg, rgba(99,102,241,0.55), rgba(59,130,246,0.25), rgba(139,92,246,0.30)) border-box',
              border: '1.5px solid transparent',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 6px 32px rgba(15,31,76,0.09), 0 2px 8px rgba(15,31,76,0.05), inset 0 1px 0 rgba(255,255,255,0.90)',
            }}
          >
            {/* ── Background design ── */}

            {/* Mesh gradient wash */}
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[20px]" style={{
              background: 'radial-gradient(ellipse at 90% 10%, rgba(99,102,241,0.07) 0%, transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(59,130,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 60%)',
            }} />

            {/* Concentric rings — top-right */}
            <svg aria-hidden className="pointer-events-none absolute -right-8 -top-8 opacity-[0.07]" width="180" height="180" viewBox="0 0 180 180" fill="none">
              {[30,55,80,105,130].map((r, i) => (
                <circle key={i} cx="90" cy="90" r={r} stroke="rgba(15,31,76,1)" strokeWidth="1" fill="none" />
              ))}
            </svg>

            {/* Scattered small dots */}
            <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" preserveAspectRatio="xMidYMid slice">
              {[[15,40],[8,75],[22,55],[35,20],[55,65],[70,30],[85,80],[92,18],[78,55],[48,85]].map(([cx, cy], i) => (
                <circle key={i} cx={`${cx}%`} cy={`${cy}%`} r="2" fill="rgba(15,31,76,1)" />
              ))}
            </svg>

            {/* Diagonal line texture — bottom-left corner */}
            <svg aria-hidden className="pointer-events-none absolute bottom-0 left-0 opacity-[0.04]" width="120" height="120" viewBox="0 0 120 120" fill="none">
              {[-20,0,20,40,60,80,100,120,140].map((offset, i) => (
                <line key={i} x1={offset} y1="0" x2={offset + 120} y2="120" stroke="rgba(15,31,76,1)" strokeWidth="1" />
              ))}
            </svg>

            {/* Decorative accent dots row */}
            <div aria-hidden className="pointer-events-none absolute right-6 top-5 flex gap-1.5">
              {[0,1,2,3,4].map(i => (
                <span key={i} className="block h-1 w-1 rounded-full" style={{ background: `rgba(15,31,76,${0.08 + i * 0.05})` }} />
              ))}
            </div>

            {/* Thin accent bar left of greeting */}
            <header className="relative mb-5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-[3px] shrink-0 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(15,31,76,0.35), rgba(15,31,76,0.10))' }} />
                <div>
                  <motion.h1
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
                    className="text-[22px] font-bold leading-tight text-[#0F1F4C]"
                    style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.02em' }}
                  >
                    {greeting()}!
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.28 }}
                    className="mt-0.5 text-[12px] text-[#6B7280]"
                  >
                    Here's how the call center is performing.
                  </motion.p>
                </div>
              </div>
              <motion.span
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.20, ease: [0.23, 1, 0.32, 1] }}
                className="rounded-full px-3 py-1 text-[11px] font-semibold text-[rgba(15,31,76,0.55)]"
                style={{ background: 'rgba(15,31,76,0.04)', border: '1px solid rgba(15,31,76,0.10)' }}
              >
                {startDate && endDate ? `${startDate} → ${endDate}` : 'All time'}
              </motion.span>
            </header>
            <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpiCards.slice(0, 4).map((card, i) => (
                <KpiHeroCard key={card.label} {...card} delay={i * 0.07} />
              ))}
            </div>
            <div className="relative mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpiCards.slice(4, 8).map((card, i) => (
                <KpiHeroCard key={card.label} {...card} delay={0.28 + i * 0.07} />
              ))}
            </div>
          </motion.section>

          <AiCommandCenter kpi={summary} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <GlassPanel className="lg:col-span-4" title="Health Score" accent="#6366F1" lottieIcon={lottieHealth}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AiOrbIcon size={16} />
                </div>
                <HealthScoreInfo />
              </div>
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

            <GlassPanel className="lg:col-span-8" title="Top Performers" accent="#10B981" lottieIcon={lottieTrophy} overflowVisible>
              {topAgents.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate">No agent data for this period.</p>
              ) : (
                <>
                  {/* ── Top 3 avatar podium ── */}
                  {topAgents.length >= 3 && (() => {
                    const RANK_CFG = {
                      1: { ring: 'linear-gradient(135deg,#F59E0B,#D97706)', ringColor: '#F59E0B', avatarPx: 80, podiumH: 64 },
                      2: { ring: 'linear-gradient(135deg,#9CA3AF,#6B7280)', ringColor: '#9CA3AF', avatarPx: 64, podiumH: 44 },
                      3: { ring: 'linear-gradient(135deg,#CD7F32,#92400E)', ringColor: '#CD7F32', avatarPx: 64, podiumH: 32 },
                    };
                    return (
                      <div className="mb-6 flex items-end justify-center gap-6">
                        {([topAgents[1], topAgents[0], topAgents[2]] as typeof topAgents).map((agent, displayIdx) => {
                          const rank = (agent.agent === topAgents[0]?.agent ? 1 : agent.agent === topAgents[1]?.agent ? 2 : 3) as 1 | 2 | 3;
                          const cfg = RANK_CFG[rank];
                          const isHovered = hoveredAgent === agent.agent;
                          return (
                            <motion.div
                              key={agent.agent}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: displayIdx * 0.08, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
                              className="relative flex flex-col items-center gap-2"
                              onMouseEnter={() => setHoveredAgent(agent.agent)}
                              onMouseLeave={() => setHoveredAgent(null)}
                            >
                              {rank === 1 && <Crown size={16} className="text-status-hold" />}

                              {/* Avatar with gradient ring + rank badge */}
                              <div className="relative">
                                <div style={{ padding: 3, borderRadius: '50%', background: cfg.ring, boxShadow: `0 6px 20px ${cfg.ringColor}60` }}>
                                  <div
                                    style={{
                                      width: cfg.avatarPx,
                                      height: cfg.avatarPx,
                                      borderRadius: '50%',
                                      border: '3px solid white',
                                      background: `linear-gradient(135deg, ${cfg.ringColor}cc, ${cfg.ringColor}66)`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontFamily: 'Poppins, sans-serif',
                                      fontWeight: 700,
                                      fontSize: cfg.avatarPx * 0.35,
                                      color: 'white',
                                      letterSpacing: '-0.01em',
                                    }}
                                  >
                                    {agent.agent.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                </div>
                                <div
                                  className="absolute -bottom-1 -right-1 flex h-[20px] w-[20px] items-center justify-center rounded-full text-[10px] font-bold text-white"
                                  style={{ background: cfg.ring, boxShadow: '0 2px 6px rgba(0,0,0,0.20)', fontFamily: 'Poppins, sans-serif' }}
                                >
                                  {rank}
                                </div>
                              </div>

                              {/* Name */}
                              <span
                                className="max-w-[90px] truncate text-[12px] font-semibold transition-colors"
                                style={{ fontFamily: 'Poppins, sans-serif', color: isHovered ? cfg.ringColor : '#1A1A2E' }}
                              >
                                {agent.agent}
                              </span>


                              {/* Podium bar */}
                              <div
                                className="w-20 rounded-t-lg"
                                style={{ height: cfg.podiumH, background: `linear-gradient(180deg, ${cfg.ringColor}30, ${cfg.ringColor}10)`, border: `1px solid ${cfg.ringColor}30` }}
                              />

                              {/* Stats tooltip */}
                              {isHovered && (
                                <motion.div
                                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                                  className="absolute bottom-full left-1/2 z-[9999] mb-3 w-[172px] -translate-x-1/2 overflow-hidden rounded-xl p-3 text-left"
                                  style={{
                                    background: 'rgba(255,255,255,0.98)',
                                    backdropFilter: 'blur(14px)',
                                    WebkitBackdropFilter: 'blur(14px)',
                                    boxShadow: `0 10px 32px ${cfg.ringColor}40, 0 2px 10px rgba(15,31,76,0.16)`,
                                    border: `1px solid ${cfg.ringColor}45`,
                                  }}
                                >
                                  <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl" style={{ background: cfg.ring }} />
                                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.10em]" style={{ color: cfg.ringColor, fontFamily: 'Poppins, sans-serif' }}>
                                    {agent.agent}
                                  </p>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate">Resolution</span>
                                      <div className="flex items-center gap-1.5">
                                        <div className="h-1 w-14 rounded-full bg-silver">
                                          <div className="h-1 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, num(agent.resolution_pct))}%` }} />
                                        </div>
                                        <span className="text-[10px] font-semibold text-obsidian">{num(agent.resolution_pct).toFixed(0)}%</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate">Escalation</span>
                                      <span className="rounded-pill bg-status-escalated-bg px-1.5 py-0.5 text-[9px] text-status-escalated">
                                        {num(agent.escalation_pct).toFixed(1)}%
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate">Compliance</span>
                                      <CompactRing value={100 - num(agent.compliance_fail_pct)} size={28} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate">Sentiment</span>
                                      <span className="flex items-center gap-1 text-[10px] font-semibold text-obsidian">
                                        <span className={`h-2 w-2 rounded-full ${num(agent.avg_sentiment) > 0.1 ? 'bg-status-live' : num(agent.avg_sentiment) < -0.1 ? 'bg-status-escalated' : 'bg-status-hold'}`} />
                                        {num(agent.avg_sentiment) > 0 ? '+' : ''}{num(agent.avg_sentiment).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate">Calls</span>
                                      <span className="text-[10px] font-semibold text-obsidian">{agent.call_count}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* ── Original agent table ── */}
                  <div className="mb-4 flex items-center justify-end">
                    <Link to="/agents" className="text-[11px] font-medium text-[#1E5EAC] hover:text-[#0F1F4C] transition-colors">
                      View all →
                    </Link>
                  </div>
                  <table className="w-full text-sm">
                    {/* sticky thead won't work here because the parent GlassPanel uses
                        overflow-visible (required for the podium hover tooltip to escape
                        the panel boundary). A sticky element needs an overflow:hidden/auto
                        ancestor — overflow:visible disables it. Use a simple border instead. */}
                    <thead className="border-b border-silver">
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
                      {topAgents.slice(3).map((agent, i) => (
                        <tr key={agent.agent} className="border-t border-silver">
                          <td className="py-2 text-slate">{i + 4}</td>
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
        <GlassPanel title="Monthly Call Volume" accent="#3B82F6" lottieIcon={lottieBars}>
          <CallVolumeTrendChart data={kpiTrends ?? []} />
          <ChartInsight
            prompt={`Given this monthly call volume trend: ${JSON.stringify(kpiTrends ?? [])}, give one short insight about the pattern.`}
            cacheKey="call-volume-df"
          />
        </GlassPanel>
        <GlassPanel title="Avg Handle Time" accent="#F59E0B" lottieIcon={lottieClock}>
          <AvgHandleTimeChart data={kpiTrends ?? []} />
          <ChartInsight
            prompt={`Given this monthly average handle time trend: ${JSON.stringify(kpiTrends ?? [])}, give one short insight about the pattern.`}
            cacheKey="avg-handle-time-df"
          />
        </GlassPanel>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Info, ChevronDown, ChevronUp,
  Flame, TrendingDown, AlertTriangle, RefreshCw,
} from 'lucide-react';
import lottieFire from '../assets/lottie/icon-fire.json';
import lottieBars from '../assets/lottie/icon-bars.json';
import InfoTooltip from '../components/shared/InfoTooltip';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import { useDataFabric } from '../lib/dataFabric';
import { getDfFrictionScore } from '../api/dataFabricQueries';
import { num } from '../utils/num';

function SCORE_COLOR(score: number): string {
  return score >= 40 ? '#DC2626' : score >= 20 ? '#D97706' : '#059669';
}

function ScoreLabel({ score }: { score: number }) {
  if (score >= 40) return <span className="text-[10px] text-red-600">High friction</span>;
  if (score >= 20) return <span className="text-[10px] text-amber-600">Medium friction</span>;
  return <span className="text-[10px] text-emerald-600">Low friction</span>;
}

interface FrictionRow {
  intent: string;
  rank: number;
  total_calls: number;
  negative_pct: number;
  escalation_pct: number;
  repeat_call_pct: number;
  friction_score: number;
}

export default function FrictionPage() {
  const { entities } = useDataFabric();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  const friction = useQuery({
    queryKey: ['df-friction-score'],
    queryFn: async (): Promise<FrictionRow[]> => {
      const data = await getDfFrictionScore(entities);
      return data as unknown as FrictionRow[];
    },
  });

  const rows = friction.data ?? [];
  const isLoading = friction.isLoading;

  const top3 = rows.slice(0, 3);

  const chartData = rows.slice(0, 8).map((f) => ({
    name: f.intent.length > 22 ? f.intent.slice(0, 20) + '…' : f.intent,
    'Neg %': Number(f.negative_pct),
    'Esc %': Number(f.escalation_pct),
    'Rep %': Number(f.repeat_call_pct),
  }));

  return (
    <div className="space-y-6">
      <FilterBar />

      {/* Top Friction Points — methodology banner + top-3 cards inside same GlassPanel */}
      <GlassPanel
        title="Top Friction Points"
        subtitle="Highest friction call intents by combined score"
        lottieIcon={lottieFire}
        accent="#F97316"
        tooltip="Friction Score = Negative Sentiment × 40% + Escalation Rate × 35% + Repeat Call Rate × 25%. A higher score means customers are most frustrated, most likely to escalate, and most likely to call back. These are your highest-priority improvement areas."
      >
        {/* Methodology banner — inside this panel per spec */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setShowMetricInfo((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700"
          >
            <Info size={12} />
            How are these metrics calculated?
            {showMetricInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showMetricInfo && (
            <div className="mt-3 space-y-3 rounded-xl border border-silver bg-bone p-4 text-xs">
              <div className="flex gap-3">
                <TrendingDown size={14} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold text-obsidian">Negative %</p>
                  <p className="mt-0.5 text-slate">
                    <span className="font-mono text-amber-700">call_sentiment = −1 → negative calls ÷ total calls × 100</span>.{' '}
                    Sentiment values: −1 (negative), 0 (neutral), +1 (positive).
                  </p>
                </div>
              </div>
              <div className="border-t border-silver pt-3 flex gap-3">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold text-obsidian">Escalation %</p>
                  <p className="mt-0.5 text-slate">
                    <span className="font-mono text-amber-700">escalation_flag = 'Yes' → escalated calls ÷ total calls × 100</span>.{' '}
                    Benchmark: <span className="text-emerald-600">≤10%</span>.
                  </p>
                </div>
              </div>
              <div className="border-t border-silver pt-3 flex gap-3">
                <RefreshCw size={14} className="mt-0.5 shrink-0 text-orange-600" />
                <div>
                  <p className="font-semibold text-obsidian">Repeat Call %</p>
                  <p className="mt-0.5 text-slate">
                    <span className="font-mono text-amber-700">repeatcall_flag = 'Yes' → repeat calls ÷ total calls × 100</span>.{' '}
                    High rates indicate first-call resolution failures.
                  </p>
                </div>
              </div>
              <div className="border-t border-silver pt-3 flex gap-3">
                <Flame size={14} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold text-obsidian">Friction Score</p>
                  <p className="mt-0.5 text-slate">
                    <span className="font-mono text-amber-700">Negative % × 0.40 + Escalation % × 0.35 + Repeat % × 0.25</span>.{' '}
                    Range 0–100. Thresholds:{' '}
                    <span className="text-red-600">≥40 = High</span>,{' '}
                    <span className="text-amber-600">20–39 = Medium</span>,{' '}
                    <span className="text-emerald-600">&lt;20 = Low</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top 3 cards */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : top3.length === 0 ? (
          <div className="md:col-span-3">
            <EmptyState title="No friction data" description="Need ≥3 calls per intent to appear here." />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {top3.map((f, i) => {
              const scoreColor = SCORE_COLOR(num(f.friction_score));
              return (
                <div key={f.intent} className="rounded-xl bg-paper p-5 border border-silver">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Flame size={16} style={{ color: scoreColor }} />
                      <span className="text-xs text-slate font-medium">Rank #{i + 1}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold leading-none" style={{ color: scoreColor }}>
                        {num(f.friction_score).toFixed(1)}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <p className="text-slate text-[10px]">friction score</p>
                        <InfoTooltip text="Composite friction score (0–100) calculated as: Negative % × 0.40 + Escalation % × 0.35 + Repeat % × 0.25. Below 20 = Low, 20–39 = Medium, 40+ = High friction." />
                      </div>
                      <ScoreLabel score={num(f.friction_score)} />
                    </div>
                  </div>

                  <p className="text-obsidian font-semibold text-sm mb-3 leading-snug">{f.intent}</p>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-slate">
                        <TrendingDown size={12} /> Negative
                        <InfoTooltip text="Percentage of calls with this intent that had negative customer sentiment. Weighted at 40% of the friction score." />
                      </span>
                      <span className="text-red-600 font-medium">{num(f.negative_pct).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-slate">
                        <AlertTriangle size={12} /> Escalated
                        <InfoTooltip text="Percentage of calls with this intent that were escalated to a supervisor. Weighted at 35% of the friction score." />
                      </span>
                      <span className="text-amber-600 font-medium">{num(f.escalation_pct).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-slate">
                        <RefreshCw size={12} /> Repeat
                        <InfoTooltip text="Percentage of calls with this intent where the customer called back within 7 days. Weighted at 25% of the friction score." />
                      </span>
                      <span className="text-orange-600 font-medium">{num(f.repeat_call_pct).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-silver pt-1.5 mt-1.5">
                      <span className="flex items-center gap-1 text-slate">
                        Total Calls
                        <InfoTooltip text="Total number of calls with this intent in the selected period. Used as the denominator for all percentage metrics above." />
                      </span>
                      <span className="text-obsidian font-medium">{num(f.total_calls)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassPanel>

      {/* Friction Component Breakdown — stacked bar chart */}
      <GlassPanel
        title="Friction Component Breakdown"
        subtitle="Negative %, Escalation %, Repeat % by intent"
        lottieIcon={lottieBars}
        accent="#F97316"
        tooltip="Stacked bar showing three friction drivers per call intent: Negative sentiment % (red), Escalation % (amber), and Repeat call % (orange). The combined height reflects overall friction. Taller bars = higher customer effort and dissatisfaction for that intent type."
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : chartData.length === 0 ? (
          <EmptyState title="No friction data" description="No data available for this period." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D6D6D6" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tick={({ x, y, payload }: { x: number | string; y: number | string; payload: { value: string } }) => {
                    const words = String(payload.value ?? '').split(' ');
                    const mid = Math.ceil(words.length / 2);
                    const line1 = words.slice(0, mid).join(' ');
                    const line2 = words.slice(mid).join(' ');
                    return (
                      <text x={x} y={y} textAnchor="middle" fill="#7B7B7B" fontSize={10}>
                        <tspan x={x} dy="0.8em">{line1}</tspan>
                        {line2 && <tspan x={x} dy="1.2em">{line2}</tspan>}
                      </text>
                    );
                  }}
                />
                <YAxis
                  tick={{ fill: '#7B7B7B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #D6D6D6', borderRadius: 8 }}
                  labelStyle={{ color: '#000000', marginBottom: 4 }}
                  itemStyle={{ color: '#333333' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#333333', paddingTop: 8 }} />
                <Bar dataKey="Neg %" stackId="a" fill="#DC2626" opacity={0.85} />
                <Bar dataKey="Esc %" stackId="a" fill="#D97706" opacity={0.85} />
                <Bar dataKey="Rep %" stackId="a" fill="#EA580C" opacity={0.85} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ChartInsight
              prompt={`Which call intents have the highest friction scores combining negative sentiment, escalations, and repeat calls? What are the top 3 friction points and what actions would reduce customer effort for each? Data: ${JSON.stringify(rows)}`}
              cacheKey="friction-breakdown"
            />
          </>
        )}
      </GlassPanel>

      {/* All Friction Points Ranked — full table */}
      <GlassPanel
        title="All Friction Points Ranked"
        subtitle="Full breakdown by intent"
        lottieIcon={lottieFire}
        accent="#F97316"
        tooltip="Complete ranked list of all call intents by friction score. Friction Score = Negative % × 0.4 + Escalation % × 0.35 + Repeat Call % × 0.25. Only intents with ≥3 calls are included. Use this to prioritise coaching, script improvements, and self-service deflection."
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-silver text-left text-xs uppercase tracking-wide text-slate">
                <th className="py-2 pr-4">Rank</th>
                <th className="py-2 pr-4">Intent</th>
                <th className="py-2 pr-4 text-right">Calls</th>
                <th className="py-2 pr-4 text-right">Neg %</th>
                <th className="py-2 pr-4 text-right">Esc %</th>
                <th className="py-2 pr-4 text-right">Rep %</th>
                <th className="py-2 text-right">Friction Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No friction data" description="No data available for this period." />
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.intent} className="border-b border-silver hover:bg-bone">
                    <td className="py-2 pr-4 text-slate text-xs">#{r.rank}</td>
                    <td className="py-2 pr-4 text-obsidian">{r.intent}</td>
                    <td className="py-2 pr-4 text-right text-graphite">{num(r.total_calls)}</td>
                    <td className="py-2 pr-4 text-right text-red-600">{num(r.negative_pct).toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-right text-amber-600">{num(r.escalation_pct).toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-right text-orange-600">{num(r.repeat_call_pct).toFixed(1)}%</td>
                    <td
                      className="py-2 text-right font-bold text-sm"
                      style={{ color: SCORE_COLOR(num(r.friction_score)) }}
                    >
                      {num(r.friction_score).toFixed(1)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </GlassPanel>
    </div>
  );
}

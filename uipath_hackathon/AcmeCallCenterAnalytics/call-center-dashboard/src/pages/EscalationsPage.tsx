import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, AlertTriangle, BarChart2 } from 'lucide-react';
import lottieEscalation from '../assets/lottie/icon-escalation.json';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import EscalationByAgentChart from '../components/charts/EscalationByAgentChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import { useFilters } from '../context/FilterContext';
import { useDataFabric } from '../lib/dataFabric';
import { getDfEscalationSummary } from '../api/dataFabricQueries';
import { num } from '../utils/num';

function escalationClass(pct: number): string {
  return pct > 10 ? 'text-red-500' : 'text-emerald-500';
}

export default function EscalationsPage() {
  const { startDate, endDate } = useFilters();
  const { entities } = useDataFabric();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  const escalation = useQuery({
    queryKey: ['df-escalation-summary'],
    queryFn: () => getDfEscalationSummary(entities),
  });

  const dfRows = escalation.data ?? [];

  // byAgent: aggregate per agent across all months, sorted descending by escalation rate
  const byAgentRows = Object.values(
    dfRows.reduce<Record<string, { agent_name: string; total_calls: number; escalation_count: number; escalation_pct: number }>>(
      (acc, row) => {
        const name = String(row.agent ?? '');
        if (!acc[name]) {
          acc[name] = { agent_name: name, total_calls: 0, escalation_count: 0, escalation_pct: 0 };
        }
        acc[name].total_calls += num(row.total_calls);
        acc[name].escalation_count += num(row.escalation_count);
        return acc;
      },
      {},
    ),
  ).map((r) => ({
    ...r,
    escalation_pct: r.total_calls > 0 ? (r.escalation_count / r.total_calls) * 100 : 0,
  })).sort((a, b) => b.escalation_pct - a.escalation_pct);

  // trendRows: aggregate per month across all agents
  const trendRows = Object.values(
    dfRows.reduce<Record<string, { month: string; total_calls: number; escalation_count: number; escalation_pct: number }>>(
      (acc, row) => {
        const month = String(row.month ?? '');
        if (!acc[month]) {
          acc[month] = { month, total_calls: 0, escalation_count: 0, escalation_pct: 0 };
        }
        acc[month].total_calls += num(row.total_calls);
        acc[month].escalation_count += num(row.escalation_count);
        return acc;
      },
      {},
    ),
  ).map((r) => ({
    ...r,
    escalation_pct: r.total_calls > 0 ? (r.escalation_count / r.total_calls) * 100 : 0,
  }));

  // Aggregate escalation counts by top_intent and second_intent from the summary rows
  const intentTotals: Record<string, number> = {};
  for (const row of dfRows) {
    const count = num(row.escalation_count);
    if (count <= 0) continue;
    const top = String(row.top_intent ?? '').trim();
    const second = String(row.second_intent ?? '').trim();
    if (top) intentTotals[top] = (intentTotals[top] ?? 0) + count;
    if (second) intentTotals[second] = (intentTotals[second] ?? 0) + Math.round(count * 0.5);
  }
  const intentData = Object.entries(intentTotals)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const byAgentLoading = escalation.isLoading;
  const trendLoading = escalation.isLoading;
  const rootCauseLoading = escalation.isLoading;

  return (
    <div className="space-y-6">
      <FilterBar />

      <div>
        <button
          type="button"
          onClick={() => setShowMetricInfo((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700"
        >
          <Info size={14} />
          How are escalation metrics calculated?
          {showMetricInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence initial={false}>
        {showMetricInfo && (
          <motion.div
            key="metric-info"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
          <div className="divide-y divide-silver rounded-xl border border-silver bg-bone p-4 text-xs">
            <div className="flex gap-3 pb-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="font-semibold text-obsidian">What counts as an escalation?</p>
                <p className="mt-0.5 text-slate">
                  A call is flagged as escalated (<span className="font-mono text-amber-700">escalation_flag = Yes</span>) when
                  the front-line agent transfers the call to a supervisor or specialist because they cannot resolve
                  the customer's issue independently. This is set by the AI agent during transcript analysis.
                </p>
              </div>
            </div>
            <div className="flex gap-3 py-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="font-semibold text-obsidian">Escalation Rate (per agent)</p>
                <p className="mt-0.5 text-slate">
                  <span className="font-mono text-amber-700">escalation_flag = Yes</span> ÷ total calls × 100, grouped
                  per agent. The benchmark is <strong>≤ 10%</strong> — rates above this appear red, at or below
                  appear green. Agents consistently above the benchmark may need additional coaching, clearer
                  escalation guidelines, or reduced call complexity in their routing queue.
                </p>
              </div>
            </div>
            <div className="flex gap-3 py-3">
              <BarChart2 size={14} className="mt-0.5 shrink-0 text-blue-500" />
              <div>
                <p className="font-semibold text-obsidian">Monthly Escalation Trend</p>
                <p className="mt-0.5 text-slate">
                  Escalation rate aggregated across all agents per calendar month. Spikes typically indicate product
                  issues, policy changes, seasonal complexity, or system outages. The amber dashed line marks the
                  10% benchmark — sustained periods above it warrant operational review. Improving months show the
                  effect of training or process interventions.
                </p>
              </div>
            </div>
            <div className="flex gap-3 py-3">
              <BarChart2 size={14} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="font-semibold text-obsidian">Escalations by Intent</p>
                <p className="mt-0.5 text-slate">
                  Absolute count of escalated calls grouped by <span className="font-mono text-amber-700">call_intent1</span>{' '}
                  (the primary detected intent of the call). High counts on a specific intent indicate a structural
                  friction point — the product, policy, or process for that intent is too complex for front-line
                  resolution and may need redesign, a decision-tree script, or a self-service alternative.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-3">
              <BarChart2 size={14} className="mt-0.5 shrink-0 text-slate" />
              <div>
                <p className="font-semibold text-obsidian">Agent Escalation Summary Table</p>
                <p className="mt-0.5 text-slate">
                  Per-agent breakdown of total calls handled, number escalated, and the resulting escalation %.
                  Sorted highest-to-lowest by rate. Use this alongside the bar chart to identify which agents
                  are driving the aggregate rate and to prioritise coaching conversations. The{' '}
                  <span className="font-mono text-amber-700">Escalation %</span> column is colour-coded: green
                  ≤ 10%, red above 10%.
                </p>
              </div>
            </div>
          </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassPanel
          title="Escalation Rate by Agent"
          subtitle="Benchmark: 10% (amber line)"
          lottieIcon={lottieEscalation}
          accent="#EF4444"
          tooltip="Percentage of each agent's calls that were escalated to a supervisor. Benchmark is ≤10%. Agents above the line may need coaching, better scripts, or reduced complexity in call routing."
        >
          {byAgentLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <EscalationByAgentChart data={byAgentRows} />
              <ChartInsight
                prompt={`Which agents have the highest escalation rates? Who exceeds the 10% benchmark and what specific coaching or process changes would reduce escalations? Data: ${JSON.stringify(byAgentRows)}`}
                cacheKey={`escalations-by-agent-${startDate}-${endDate}`}
              />
            </>
          )}
        </GlassPanel>

        <GlassPanel
          title="Escalation Trend"
          subtitle="Monthly escalation % over time"
          lottieIcon={lottieEscalation}
          accent="#EF4444"
          tooltip="Monthly escalation rate over the selected period. Spikes may indicate product issues, system outages, or high-complexity call months. The amber dashed line marks the 10% benchmark — sustained periods above it warrant investigation."
        >
          {trendLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <TrendLineChart
                data={trendRows as Record<string, unknown>[]}
                xDataKey="month"
                series={[{ dataKey: 'escalation_pct', label: 'Escalation %', stroke: '#EF4444' }]}
                benchmark={{ value: 10, label: '10% bench', color: '#F59E0B' }}
              />
              <ChartInsight
                prompt={`Analyse the monthly escalation rate trend. Are escalations improving or worsening? What months show concerning spikes and what might be driving them? Data: ${JSON.stringify(trendRows)}`}
                cacheKey="escalations-trend"
              />
            </>
          )}
        </GlassPanel>
      </div>

      <GlassPanel
        title="Escalations by Intent"
        subtitle="Which call types drive escalations"
        lottieIcon={lottieEscalation}
        accent="#EF4444"
        tooltip="Number of escalated calls broken down by call intent. Intents with high escalation counts are structural friction points — they may need process redesign, better agent training, or self-service alternatives."
      >
        {rootCauseLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : intentData.length === 0 ? (
          <EmptyState title="No intent data" description="No data available for this period." />
        ) : (
          <>
            <HorizontalBarChart
              data={intentData}
              color="#F59E0B"
              height={Math.max(220, intentData.length * 38)}
              valueFormatter={(v) => String(v)}
            />
            <ChartInsight
              prompt={`Which call intent types are driving the most escalations? Are these structural problems or agent skill gaps? What process changes would reduce escalations for the top intents? Data: ${JSON.stringify(intentData)}`}
              cacheKey="escalations-root-cause"
            />
          </>
        )}
      </GlassPanel>

      <GlassPanel
        title="Agent Escalation Summary"
        subtitle="Per-agent totals · sorted by escalation rate"
        lottieIcon={lottieEscalation}
        accent="#EF4444"
        tooltip="Per-agent breakdown of total calls handled, number escalated, and escalation rate. Sorted highest to lowest. Escalation % is green at ≤ 10% (on target) and red above 10% (needs review). Use this table to identify which agents are driving the overall escalation rate and to prioritise coaching."
      >
        {byAgentLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : byAgentRows.length === 0 ? (
          <EmptyState title="No agent escalation data" description="No data available for this period." />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-left text-[11px] text-slate">
                <th className="pb-2">Agent</th>
                <th className="pb-2">Total Calls</th>
                <th className="pb-2">Escalated</th>
                <th className="pb-2">Escalation %</th>
              </tr>
            </thead>
            <tbody>
              {byAgentRows.map((row) => (
                <tr key={row.agent_name} className="border-t border-silver hover:bg-bone">
                  <td className="py-2 font-medium text-obsidian">{row.agent_name}</td>
                  <td className="py-2 text-slate">{num(row.total_calls)}</td>
                  <td className="py-2 text-slate">{num(row.escalation_count)}</td>
                  <td className={`py-2 font-medium ${escalationClass(num(row.escalation_pct))}`}>
                    {num(row.escalation_pct).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassPanel>
    </div>
  );
}

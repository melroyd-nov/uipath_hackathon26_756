import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, ShieldCheck, TrendingUp, BarChart2 } from 'lucide-react';
import lottieShield from '../assets/lottie/icon-shield.json';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import ComplianceByAgentChart from '../components/charts/ComplianceByAgentChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import { useFilters } from '../context/FilterContext';
import { useDataFabric } from '../lib/dataFabric';
import { getDfComplianceTrend } from '../api/dataFabricQueries';
import { num } from '../utils/num';

const BENCHMARK = 5;

function failRateClass(pct: number): string {
  return pct > BENCHMARK ? 'text-red-600' : 'text-emerald-600';
}

export default function CompliancePage() {
  const { entities } = useDataFabric();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  const compliance = useQuery({
    queryKey: ['df-compliance-trend'],
    queryFn: () => getDfComplianceTrend(entities),
  });

  const dfRows = compliance.data ?? [];

  // byAgent: aggregate per agent — JSX uses agent_name, fail_count, total_calls, compliance_fail_pct
  const byAgentRows = Object.values(
    dfRows.reduce<Record<string, { agent_name: string; total_calls: number; fail_count: number; compliance_fail_pct: number }>>(
      (acc, row) => {
        const name = String(row.agent ?? '');
        if (!acc[name]) {
          acc[name] = { agent_name: name, total_calls: 0, fail_count: 0, compliance_fail_pct: 0 };
        }
        acc[name].total_calls += num(row.total_calls as number);
        acc[name].fail_count += num(row.fail_count as number);
        return acc;
      },
      {},
    ),
  ).map((r) => ({
    ...r,
    compliance_fail_pct: r.total_calls > 0 ? (r.fail_count / r.total_calls) * 100 : 0,
  })).sort((a, b) => b.compliance_fail_pct - a.compliance_fail_pct);

  // trendRows: use DF rows directly — already has month + compliance_fail_pct
  const trendRows = dfRows;

  const byAgentLoading = compliance.isLoading;
  const trendLoading = compliance.isLoading;

  return (
    <div className="space-y-6">
      <FilterBar />

      {/* Methodology banner */}
      <div>
        <button
          type="button"
          onClick={() => setShowMetricInfo((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700"
        >
          <Info size={12} />
          How are compliance metrics calculated?
          {showMetricInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <AnimatePresence initial={false}>
          {showMetricInfo && (
            <motion.div
              key="compliance-info"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div className="divide-y divide-silver rounded-xl border border-silver bg-bone p-4 text-xs">
                <div className="flex gap-3 pb-3">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-red-600" />
                  <div>
                    <p className="font-semibold text-obsidian">What counts as a compliance failure?</p>
                    <p className="mt-0.5 text-slate">
                      A call is marked as a compliance failure (<span className="font-mono text-amber-700">compliance_flag = No</span>) when
                      the AI agent detects that required protocols were not followed — such as failing to read the
                      mandatory disclosure, skipping identity verification steps, or breaching data-privacy obligations.
                      <span className="font-mono text-amber-700"> compliance_flag = Yes</span> means the call passed all checks.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 py-3">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold text-obsidian">Compliance Fail Rate (per agent)</p>
                    <p className="mt-0.5 text-slate">
                      <span className="font-mono text-amber-700">compliance_flag = No ÷ total calls × 100</span>, grouped
                      per agent. The benchmark is <strong>≤ 5%</strong> — any agent above this poses direct regulatory
                      exposure. Rates are colour-coded: green ≤ 5%, red above 5%. Treat agents above the line as
                      high priority for refresher training or call script review.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 py-3">
                  <TrendingUp size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold text-obsidian">Monthly Compliance Failure Trend</p>
                    <p className="mt-0.5 text-slate">
                      Compliance fail rate aggregated across all agents per calendar month. Upward trends or sudden
                      spikes typically indicate a new product rollout without adequate training, a policy change
                      agents are unaware of, or system/script issues. The amber dashed line marks the 5% benchmark —
                      sustained time above it warrants immediate operational review.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 py-3">
                  <TrendingUp size={14} className="mt-0.5 shrink-0 text-blue-500" />
                  <div>
                    <p className="font-semibold text-obsidian">vs Benchmark column</p>
                    <p className="mt-0.5 text-slate">
                      Shows how far each agent is from the <span className="text-emerald-600">≤ 5%</span> target.{' '}
                      <span className="font-mono text-amber-700">+X% over</span> = percentage points above 5% (e.g., +3.2% over means a fail rate of 8.2%).{' '}
                      <span className="text-emerald-600">On target</span> = the agent is at or below the 5% threshold.
                      Agents are sorted highest-to-lowest so the most at-risk appear first.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-3">
                  <BarChart2 size={14} className="mt-0.5 shrink-0 text-slate" />
                  <div>
                    <p className="font-semibold text-obsidian">Agent Compliance Summary Table</p>
                    <p className="mt-0.5 text-slate">
                      Aggregated per-agent view of total calls handled, number of compliance failures, and the
                      resulting fail rate. Sorted highest-to-lowest by fail rate so the riskiest agents are always
                      at the top. Use this table alongside the bar chart to confirm rankings and to quickly identify
                      which agents need immediate intervention vs. those who are comfortably on target.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassPanel
          title="Compliance Failure Rate by Agent"
          subtitle="Benchmark: 5% (amber line) — lower is better"
          lottieIcon={lottieShield}
          accent="#10B981"
          tooltip="Compliance_Flag = 'No' means the agent failed to follow required protocol on that call. Rate = failures ÷ total calls × 100. Benchmark is ≤5%. Any agent above the line poses regulatory exposure — treat as high priority."
        >
          {byAgentLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <ComplianceByAgentChart data={byAgentRows} benchmark={BENCHMARK} />
              <ChartInsight
                prompt={`Which agents have the highest compliance failure rates? Who is above the 5% benchmark and what are the immediate risk mitigation actions required? Data: ${JSON.stringify(byAgentRows)}`}
                cacheKey="compliance-by-agent"
              />
            </>
          )}
        </GlassPanel>

        <GlassPanel
          title="Compliance Failure Trend"
          subtitle="Monthly failure % over time"
          lottieIcon={lottieShield}
          accent="#10B981"
          tooltip="Monthly compliance failure rate over the selected period. Upward trends or sudden spikes may indicate a process change, new product rollout, or inadequate refresher training. The amber line marks the 5% benchmark."
        >
          {trendLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <TrendLineChart
                data={trendRows}
                xDataKey="month"
                series={[{ dataKey: 'compliance_fail_pct', label: 'Fail %', stroke: '#EF4444' }]}
                benchmark={{ value: BENCHMARK, label: '5% bench', color: '#F59E0B' }}
              />
              <ChartInsight
                prompt={`Analyse the monthly compliance failure trend. Is the rate improving or worsening? What months are most concerning and what interventions would bring it back under the 5% benchmark? Data: ${JSON.stringify(trendRows)}`}
                cacheKey="compliance-trend"
              />
            </>
          )}
        </GlassPanel>
      </div>

      {/* Summary table */}
      <GlassPanel
        title="Agent Compliance Summary"
        subtitle="Per-agent totals · sorted by fail rate"
        lottieIcon={lottieShield}
        accent="#10B981"
        tooltip="Per-agent breakdown of total calls handled, failures detected, and compliance fail rate. Sorted highest-to-lowest. Green = ≤ 5% (on target); red = above 5% (regulatory risk). Use alongside the bar chart to prioritise coaching conversations."
      >
        {byAgentLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : byAgentRows.length === 0 ? (
          <EmptyState title="No compliance data" description="No data available for this period." />
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F1F3F9] text-[10px] uppercase tracking-wider text-[#374151]">
                <th className="rounded-l-lg py-2 pl-3 text-left font-bold">Agent</th>
                <th className="py-2 text-right font-bold">Calls</th>
                <th className="py-2 text-right font-bold">Failures</th>
                <th className="py-2 pl-3 text-left font-bold">Fail %</th>
                <th className="rounded-r-lg py-2 pr-3 text-right font-bold">vs Bench</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-silver/50">
              {byAgentRows.map((row) => {
                const pct = num(row.compliance_fail_pct);
                const over = pct - BENCHMARK;
                const isOver = pct > BENCHMARK;
                const initials = row.agent_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={row.agent_name} className="group transition-colors hover:bg-bone/60">
                    {/* Agent — avatar + name */}
                    <td className="py-2 pl-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: isOver ? '#ef4444' : '#10b981' }}
                        >
                          {initials}
                        </span>
                        <span className="font-semibold text-obsidian">{row.agent_name}</span>
                      </div>
                    </td>
                    {/* Calls */}
                    <td className="py-2 text-right tabular-nums font-medium text-graphite">{num(row.total_calls)}</td>
                    {/* Failures */}
                    <td className="py-2 text-right tabular-nums font-semibold text-red-500">{num(row.fail_count)}</td>
                    {/* Fail % with mini bar */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-silver/60">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (pct / 15) * 100)}%`,
                              background: isOver ? '#ef4444' : '#10b981',
                            }}
                          />
                        </div>
                        <span className={`tabular-nums font-semibold ${failRateClass(pct)}`}>{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    {/* vs Bench */}
                    <td className="py-2 pr-3 text-right">
                      <span className={`font-bold tabular-nums ${isOver ? 'text-red-500' : 'text-emerald-500'}`}>
                        {isOver ? `+${over.toFixed(1)}%` : '✓ On target'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </GlassPanel>
    </div>
  );
}

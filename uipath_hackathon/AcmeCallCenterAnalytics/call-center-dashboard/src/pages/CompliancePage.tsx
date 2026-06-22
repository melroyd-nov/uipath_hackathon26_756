import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, ShieldCheck, TrendingUp } from 'lucide-react';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import ComplianceByAgentChart from '../components/charts/ComplianceByAgentChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import { useFilters } from '../context/FilterContext';
import { useDummyDataContext } from '../context/DummyDataContext';
import { getComplianceByAgent, getComplianceTrend } from '../api/analytics';
import { mockComplianceByAgent, mockComplianceTrend } from '../data/mockComplianceData';
import { num } from '../utils/num';

const BENCHMARK = 5;

function failRateClass(pct: number): string {
  return pct > BENCHMARK ? 'text-red-400' : 'text-emerald-400';
}

export default function CompliancePage() {
  const { startDate, endDate, agentFilter } = useFilters();
  const filters = { start_date: startDate ?? undefined, end_date: endDate ?? undefined, agent: agentFilter ?? undefined };
  const { useDummyData } = useDummyDataContext();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  const byAgent = useQuery({
    queryKey: ['compliance-by-agent', startDate, endDate],
    queryFn: () => getComplianceByAgent({ start_date: startDate ?? undefined, end_date: endDate ?? undefined }),
    enabled: !useDummyData,
  });

  const trend = useQuery({
    queryKey: ['compliance-trend', startDate, endDate, agentFilter],
    queryFn: () => getComplianceTrend(filters),
    enabled: !useDummyData,
  });

  const byAgentRows = useDummyData ? mockComplianceByAgent : byAgent.data ?? [];
  const trendRows = useDummyData ? mockComplianceTrend : trend.data ?? [];
  const byAgentLoading = !useDummyData && byAgent.isLoading;
  const trendLoading = !useDummyData && trend.isLoading;

  return (
    <div className="space-y-6">
      <FilterBar />

      {/* Methodology banner */}
      <div>
        <button
          type="button"
          onClick={() => setShowMetricInfo((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300"
        >
          <Info size={12} />
          How are compliance metrics calculated?
          {showMetricInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showMetricInfo && (
          <div className="mt-3 space-y-3 rounded-xl border border-white/8 bg-white/3 p-4 text-xs">
            <div className="flex gap-3">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="font-semibold text-white">Compliance Fail Rate</p>
                <p className="mt-0.5 text-slate">
                  <span className="font-mono text-amber-300">compliance_flag = 'No' ÷ total calls × 100</span>
                  {' — '}
                  <span className="font-medium text-white">"No"</span> = failed;{' '}
                  <span className="font-medium text-white">"Yes"</span> = passed. Benchmark:{' '}
                  <span className="text-emerald-400">≤5%</span>. Exceeding this threshold indicates regulatory risk
                  and requires immediate coaching or process review.
                </p>
              </div>
            </div>
            <div className="border-t border-white/5 pt-3 flex gap-3">
              <TrendingUp size={14} className="mt-0.5 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold text-white">vs Benchmark column</p>
                <p className="mt-0.5 text-slate">
                  Shows how far each agent is from the{' '}
                  <span className="text-emerald-400">≤5%</span> target.{' '}
                  <span className="font-mono text-amber-300">+X% over</span> = percentage points above 5%.{' '}
                  <span className="text-emerald-400">On target</span> = at or below 5%.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassPanel
          title="Compliance Failure Rate by Agent"
          subtitle="Benchmark: 5% (amber line) — lower is better"
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
                cacheKey={`compliance-by-agent-${startDate}-${endDate}`}
              />
            </>
          )}
        </GlassPanel>

        <GlassPanel
          title="Compliance Failure Trend"
          subtitle="Monthly failure % over time"
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
                series={[{ dataKey: 'compliance_fail_pct', label: 'Fail %', stroke: '#EF4444' }]}
                benchmark={{ value: BENCHMARK, label: '5% bench', color: '#F59E0B' }}
              />
              <ChartInsight
                prompt={`Analyse the monthly compliance failure trend. Is the rate improving or worsening? What months are most concerning and what interventions would bring it back under the 5% benchmark? Data: ${JSON.stringify(trendRows)}`}
                cacheKey={`compliance-trend-${JSON.stringify(filters)}`}
              />
            </>
          )}
        </GlassPanel>
      </div>

      {/* Summary table */}
      <GlassPanel title="Agent Compliance Summary">
        {byAgentLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : byAgentRows.length === 0 ? (
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td colSpan={5}>
                  <EmptyState title="No compliance data" description="No data available for this period." />
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4 text-right">Total Calls</th>
                <th className="py-2 pr-4 text-right">Failures</th>
                <th className="py-2 pr-4 text-right">Fail Rate</th>
                <th className="py-2 text-right">vs Benchmark</th>
              </tr>
            </thead>
            <tbody>
              {byAgentRows.map((row) => {
                const pct = num(row.compliance_fail_pct);
                const over = pct - BENCHMARK;
                return (
                  <tr key={row.agent_name} className="border-b border-white/5 hover:bg-white/3">
                    <td className="py-2 pr-4 font-medium text-white">{row.agent_name}</td>
                    <td className="py-2 pr-4 text-right text-gray-300">{num(row.total_calls)}</td>
                    <td className="py-2 pr-4 text-right text-red-400">{num(row.fail_count)}</td>
                    <td className={`py-2 pr-4 text-right text-xs font-medium ${failRateClass(pct)}`}>
                      {pct.toFixed(1)}%
                    </td>
                    <td className="py-2 text-right">
                      {pct > BENCHMARK ? (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
                          +{over.toFixed(1)}% over
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                          On target
                        </span>
                      )}
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

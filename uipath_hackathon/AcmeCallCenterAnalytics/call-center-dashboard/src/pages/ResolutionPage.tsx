import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, CheckCircle, RefreshCw } from 'lucide-react';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import ResolutionDonutChart from '../components/charts/ResolutionDonutChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import { useFilters } from '../context/FilterContext';
import { useDataFabric } from '../lib/dataFabric';
import { getDfKpiSummary, getDfKpiTrends, getDfAgentSummary } from '../api/dataFabricQueries';
import { num } from '../utils/num';

const BRAND_COLOR = '#6366F1';
const REPEAT_BENCH = 20;

function repeatRateClass(pct: number): string {
  if (pct > REPEAT_BENCH) return 'text-red-600';
  if (pct > 14) return 'text-amber-600';
  return 'text-emerald-600';
}

export default function ResolutionPage() {
  const { entities } = useDataFabric();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  const kpiSummary = useQuery({
    queryKey: ['df-dashboard-summary'],
    queryFn: () => getDfKpiSummary(entities),
  });

  const kpiTrends = useQuery({
    queryKey: ['df-kpi-trends'],
    queryFn: () => getDfKpiTrends(entities),
  });

  const agentSummary = useQuery({
    queryKey: ['df-agent-summary'],
    queryFn: () => getDfAgentSummary(entities),
  });

  const overviewData = kpiSummary.data
    ? (() => {
        const resPct = Number(kpiSummary.data.resolution_pct ?? 0);
        const total = Number(kpiSummary.data.total_calls ?? 0);
        return {
          resolved_count: Math.round((resPct / 100) * total),
          unresolved_count: Math.round(((100 - resPct) / 100) * total),
          resolution_pct: resPct,
        };
      })()
    : undefined;

  // resTrendRows: {month, resolution_pct, total_calls}
  const resTrendRows = (kpiTrends.data ?? []).map((r) => ({
    month: r.month,
    resolution_pct: Number(r.resolution_pct),
    total_calls: Number(r.total_calls),
  })) as Record<string, unknown>[];

  // repeatTrendRows: {month, repeat_pct, total_calls}
  const repeatTrendRows = (kpiTrends.data ?? []).map((r) => ({
    month: r.month,
    repeat_pct: Number(r.repeat_call_pct),
    total_calls: Number(r.total_calls),
  })) as Record<string, unknown>[];

  // repeatByAgentRows: {agent_name, total_calls, repeat_count, repeat_pct}
  const repeatByAgentRows = (agentSummary.data ?? []).map((r) => ({
    agent_name: r.agent,
    total_calls: r.call_count,
    repeat_count: Math.round((Number(r.repeat_pct) / 100) * r.call_count),
    repeat_pct: Number(r.repeat_pct),
  }));

  const overviewLoading = kpiSummary.isLoading;
  const resTrendLoading = kpiTrends.isLoading;
  const repeatTrendLoading = kpiTrends.isLoading;
  const repeatByAgentLoading = agentSummary.isLoading;

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
          How are resolution metrics calculated?
          {showMetricInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showMetricInfo && (
          <div className="mt-3 space-y-3 rounded-xl border border-silver bg-bone p-4 text-xs">
            <div className="flex gap-3">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-obsidian">Resolution Rate</p>
                <p className="mt-0.5 text-slate">
                  <span className="font-mono text-amber-700">call_resolved_flag = 'Yes' ÷ total calls × 100</span>
                  {'. '}
                  Benchmark: <span className="text-emerald-600">≥80%</span>. Below this threshold signals agent
                  knowledge gaps, complex calls, or inadequate support tooling.
                </p>
              </div>
            </div>
            <div className="border-t border-silver pt-3 flex gap-3">
              <RefreshCw size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-obsidian">Repeat Call Rate</p>
                <p className="mt-0.5 text-slate">
                  <span className="font-mono text-amber-700">repeatcall_flag = 'Yes' ÷ total calls × 100</span>
                  {'. '}
                  Benchmark: <span className="text-emerald-600">≤20%</span>.{' '}
                  Thresholds:{' '}
                  <span className="text-red-600">red &gt;20%</span>,{' '}
                  <span className="text-amber-600">amber 14–20%</span>,{' '}
                  <span className="text-emerald-600">green ≤14%</span>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top row: Donut overview (1/3) + Resolution trend (2/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassPanel
          title="Resolution Overview"
          subtitle="Resolved vs Unresolved"
          tooltip="Donut showing the split of call outcomes: Resolved (issue fixed on the call) vs Unresolved. A healthy centre targets ≥80% resolved."
        >
          {overviewLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <ResolutionDonutChart data={overviewData} />
              <ChartInsight
                prompt={`Based on the resolved vs unresolved call split, how healthy is first-call resolution? Is the unresolved rate acceptable and what actions would improve it? Data: ${JSON.stringify(overviewData)}`}
                cacheKey="resolution-overview"
              />
            </>
          )}
        </GlassPanel>

        <GlassPanel
          title="Resolution Rate Trend"
          subtitle="Monthly % — benchmark: 80%"
          tooltip="Tracks the monthly percentage of calls fully resolved on the first interaction. The dashed line marks the 80% benchmark. Dips below the line signal agent knowledge gaps, system issues, or complex call types needing process support."
          className="lg:col-span-2"
        >
          {resTrendLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <TrendLineChart
                data={resTrendRows as Record<string, unknown>[]}
                series={[{ dataKey: 'resolution_pct', label: 'Resolution %', stroke: BRAND_COLOR }]}
                benchmark={{ value: 80, label: '80%', color: BRAND_COLOR }}
              />
              <ChartInsight
                prompt={`Analyse the monthly resolution rate trend. Is performance improving or declining? Which months fell below the 80% benchmark and what actions are needed? Data: ${JSON.stringify(resTrendRows)}`}
                cacheKey="resolution-trend"
              />
            </>
          )}
        </GlassPanel>
      </div>

      {/* Bottom row: Repeat Call Trend (left) + Repeat Call by Agent table (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassPanel
          title="Repeat Call Trend"
          subtitle="Monthly repeat call %"
          tooltip="Percentage of calls per month where the customer called back for the same issue. High repeat rates indicate first-call resolution failures. Aim for ≤20%."
        >
          {repeatTrendLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <TrendLineChart
                data={repeatTrendRows as Record<string, unknown>[]}
                series={[{ dataKey: 'repeat_pct', label: 'Repeat Call %', stroke: '#F59E0B' }]}
                benchmark={{ value: REPEAT_BENCH, label: '20% bench', color: '#F59E0B' }}
              />
              <ChartInsight
                prompt={`Analyse the monthly repeat call trend. Is the rate rising or falling? What is likely causing customers to call back and what process or training changes would reduce repeat calls? Data: ${JSON.stringify(repeatTrendRows)}`}
                cacheKey="repeat-call-trend"
              />
            </>
          )}
        </GlassPanel>

        <GlassPanel title="Repeat Call Rate by Agent">
          {repeatByAgentLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : repeatByAgentRows.length === 0 ? (
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="No repeat call data" description="No data available for this period." />
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-silver text-left text-xs uppercase tracking-wide text-slate">
                  <th className="py-2 pr-4">Agent</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 pr-4 text-right">Repeats</th>
                  <th className="py-2 text-right">Repeat %</th>
                </tr>
              </thead>
              <tbody>
                {repeatByAgentRows.map((r) => (
                  <tr key={r.agent_name} className="border-b border-silver hover:bg-bone">
                    <td className="py-2 pr-4 font-medium text-obsidian">{r.agent_name}</td>
                    <td className="py-2 pr-4 text-right text-graphite">{num(r.total_calls)}</td>
                    <td className="py-2 pr-4 text-right text-amber-600">{num(r.repeat_count)}</td>
                    <td className={`py-2 text-right text-xs font-medium ${repeatRateClass(num(r.repeat_pct))}`}>
                      {num(r.repeat_pct).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}

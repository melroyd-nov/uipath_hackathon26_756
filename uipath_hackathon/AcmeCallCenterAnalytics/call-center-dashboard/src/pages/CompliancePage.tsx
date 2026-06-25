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
  }));

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

        {showMetricInfo && (
          <div className="mt-3 space-y-3 rounded-xl border border-silver bg-bone p-4 text-xs">
            <div className="flex gap-3">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-obsidian">Compliance Fail Rate</p>
                <p className="mt-0.5 text-slate">
                  <span className="font-mono text-amber-700">compliance_flag = 'No' ÷ total calls × 100</span>
                  {' — '}
                  <span className="font-medium text-obsidian">"No"</span> = failed;{' '}
                  <span className="font-medium text-obsidian">"Yes"</span> = passed. Benchmark:{' '}
                  <span className="text-emerald-600">≤5%</span>. Exceeding this threshold indicates regulatory risk
                  and requires immediate coaching or process review.
                </p>
              </div>
            </div>
            <div className="border-t border-silver pt-3 flex gap-3">
              <TrendingUp size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-obsidian">vs Benchmark column</p>
                <p className="mt-0.5 text-slate">
                  Shows how far each agent is from the{' '}
                  <span className="text-emerald-600">≤5%</span> target.{' '}
                  <span className="font-mono text-amber-700">+X% over</span> = percentage points above 5%.{' '}
                  <span className="text-emerald-600">On target</span> = at or below 5%.
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
                cacheKey="compliance-by-agent"
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
                cacheKey="compliance-trend"
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
              <tr className="border-b border-silver text-left text-xs uppercase tracking-wide text-slate">
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
                  <tr key={row.agent_name} className="border-b border-silver hover:bg-bone">
                    <td className="py-2 pr-4 font-medium text-obsidian">{row.agent_name}</td>
                    <td className="py-2 pr-4 text-right text-graphite">{num(row.total_calls)}</td>
                    <td className="py-2 pr-4 text-right text-red-600">{num(row.fail_count)}</td>
                    <td className={`py-2 pr-4 text-right text-xs font-medium ${failRateClass(pct)}`}>
                      {pct.toFixed(1)}%
                    </td>
                    <td className="py-2 text-right">
                      {pct > BENCHMARK ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          +{over.toFixed(1)}% over
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
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

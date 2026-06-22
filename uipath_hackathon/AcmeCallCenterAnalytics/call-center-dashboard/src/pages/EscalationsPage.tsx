import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, AlertTriangle, BarChart2 } from 'lucide-react';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import EscalationByAgentChart from '../components/charts/EscalationByAgentChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import { useFilters } from '../context/FilterContext';
import { useDummyDataContext } from '../context/DummyDataContext';
import { getEscalationsByAgent, getEscalationsTrend, getEscalationsRootCause } from '../api/analytics';
import { mockEscalationsByAgent, mockEscalationsTrend, mockEscalationsRootCause } from '../data/mockEscalationsData';
import { num } from '../utils/num';

function escalationClass(pct: number): string {
  return pct > 10 ? 'text-red-500' : 'text-emerald-500';
}

export default function EscalationsPage() {
  const { startDate, endDate, agentFilter } = useFilters();
  const filters = { start_date: startDate ?? undefined, end_date: endDate ?? undefined, agent: agentFilter ?? undefined };
  const { useDummyData } = useDummyDataContext();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  const byAgent = useQuery({
    queryKey: ['escalations-by-agent', startDate, endDate],
    queryFn: () => getEscalationsByAgent({ start_date: startDate ?? undefined, end_date: endDate ?? undefined }),
    enabled: !useDummyData,
  });

  const trend = useQuery({
    queryKey: ['escalations-trend', filters],
    queryFn: () => getEscalationsTrend(filters),
    enabled: !useDummyData,
  });

  const rootCause = useQuery({
    queryKey: ['escalations-root-cause', filters],
    queryFn: () => getEscalationsRootCause(filters),
    enabled: !useDummyData,
  });

  const byAgentRows = useDummyData ? mockEscalationsByAgent : byAgent.data ?? [];
  const trendRows = useDummyData ? mockEscalationsTrend : trend.data ?? [];
  const rootCauseData = useDummyData ? mockEscalationsRootCause : rootCause.data;

  const byAgentLoading = !useDummyData && byAgent.isLoading;
  const trendLoading = !useDummyData && trend.isLoading;
  const rootCauseLoading = !useDummyData && rootCause.isLoading;

  const intentData = (rootCauseData?.by_intent ?? []).map((i) => ({ label: i.intent, value: i.escalation_count }));

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

        {showMetricInfo && (
          <div className="mt-3 divide-y divide-silver rounded-xl border border-silver bg-bone p-4">
            <div className="flex gap-3 pb-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-obsidian">Escalation Rate</p>
                <p className="mt-0.5 text-xs text-slate">
                  escalation_flag = 'Yes' ÷ total calls × 100. A call is escalated when the agent transfers it to a
                  supervisor/specialist because they cannot resolve it independently. Benchmark ≤10% — red above,
                  green at/below.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-3">
              <BarChart2 size={16} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-obsidian">Escalations by Intent</p>
                <p className="mt-0.5 text-xs text-slate">
                  Absolute count of escalated calls grouped by call_intent1. High counts on a specific intent
                  indicate a structural friction point — the process/product for that intent is too complex for
                  front-line agents.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassPanel
          title="Escalation Rate by Agent"
          subtitle="Benchmark: 10% (amber line)"
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
          tooltip="Monthly escalation rate over the selected period. Spikes may indicate product issues, system outages, or high-complexity call months. The amber dashed line marks the 10% benchmark — sustained periods above it warrant investigation."
        >
          {trendLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <TrendLineChart
                data={trendRows}
                series={[{ dataKey: 'escalation_pct', label: 'Escalation %', stroke: '#EF4444' }]}
                benchmark={{ value: 10, label: '10% bench', color: '#F59E0B' }}
              />
              <ChartInsight
                prompt={`Analyse the monthly escalation rate trend. Are escalations improving or worsening? What months show concerning spikes and what might be driving them? Data: ${JSON.stringify(trendRows)}`}
                cacheKey={`escalations-trend-${JSON.stringify(filters)}`}
              />
            </>
          )}
        </GlassPanel>
      </div>

      <GlassPanel
        title="Escalations by Intent"
        subtitle="Which call types drive escalations"
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
              prompt={`Which call intent types are driving the most escalations? Are these structural problems or agent skill gaps? What process changes would reduce escalations for the top intents? Data: ${JSON.stringify(rootCauseData?.by_intent ?? [])}`}
              cacheKey={`escalations-root-cause-${JSON.stringify(filters)}`}
            />
          </>
        )}
      </GlassPanel>

      <GlassPanel title="Agent Escalation Summary">
        {byAgentLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : byAgentRows.length === 0 ? (
          <EmptyState title="No agent escalation data" description="No data available for this period." />
        ) : (
          <table className="w-full text-sm">
            <thead>
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

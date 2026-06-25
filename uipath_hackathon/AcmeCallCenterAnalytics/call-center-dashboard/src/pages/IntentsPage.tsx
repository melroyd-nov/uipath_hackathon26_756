import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, BarChart2, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import IntentParetoChart from '../components/charts/IntentParetoChart';
import { useFilters } from '../context/FilterContext';
import { useDataFabric } from '../lib/dataFabric';
import { getDfIntentSummary } from '../api/dataFabricQueries';
import type { IntentPareto } from '../api/analytics';
import { exportCsv } from '../utils/csv';
import { num } from '../utils/num';

function sentimentClass(score: number): string {
  if (score > 0.1) return 'text-emerald-500';
  if (score < -0.1) return 'text-red-500';
  return 'text-amber-500';
}

function escalationClass(pct: number): string {
  return pct > 10 ? 'text-red-500' : 'text-emerald-500';
}

function repeatCallClass(pct: number): string {
  if (pct > 20) return 'text-red-500';
  if (pct >= 10) return 'text-amber-500';
  return 'text-emerald-500';
}

export default function IntentsPage() {
  const { startDate, endDate } = useFilters();
  const filters = { start_date: startDate ?? undefined, end_date: endDate ?? undefined };
  const { entities } = useDataFabric();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  const pareto = useQuery({
    queryKey: ['df-intent-summary'],
    queryFn: async (): Promise<IntentPareto[]> => {
      const data = await getDfIntentSummary(entities);
      return data as unknown as IntentPareto[];
    },
  });

  const rows = pareto.data ?? [];
  const isLoading = pareto.isLoading;
  const sortedRows = [...rows].sort((a, b) => num(b.count) - num(a.count));

  const handleExport = () => {
    exportCsv(
      'intents',
      sortedRows.map((row) => ({
        intent: row.intent,
        calls: num(row.count),
        share_pct: num(row.pct),
        cumulative_pct: num(row.cumulative_pct),
        avg_sentiment: num(row.avg_sentiment),
        escalation_pct: num(row.escalation_pct),
        repeat_call_pct: num(row.repeat_call_pct),
      })),
    );
  };

  return (
    <div className="space-y-6">
      <FilterBar />

      <GlassPanel
        title="Intent Pareto Analysis"
        subtitle="Call volume by intent — sorted highest to lowest"
        tooltip="Horizontal bar chart showing call volume by intent type, sorted from highest to lowest. Each bar is colour-coded. The intent at the top drives the most calls — prioritise these for automation, improved agent scripts, or self-service deflection."
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : (
          <>
            <IntentParetoChart data={rows} />
            <ChartInsight
              prompt={`Which call intents drive the most volume? Among the top intents, which have poor sentiment or high escalation rates? What automation or self-service opportunities exist? Data: ${JSON.stringify(rows)}`}
              cacheKey={`intents-pareto-${JSON.stringify(filters)}`}
            />
          </>
        )}
      </GlassPanel>

      <GlassPanel title="Intent Detail Table" onExport={handleExport}>
        <button
          type="button"
          onClick={() => setShowMetricInfo((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700"
        >
          <Info size={14} />
          How are these columns calculated?
          {showMetricInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showMetricInfo && (
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-silver bg-bone p-4 md:grid-cols-2">
            <div className="flex gap-3">
              <BarChart2 size={16} className="mt-0.5 shrink-0 text-sage-bloom" />
              <div>
                <p className="text-sm font-medium text-obsidian">Share %</p>
                <p className="mt-0.5 text-xs text-slate">
                  Intent calls ÷ total calls × 100 — how much of total call volume this intent represents.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <BarChart2 size={16} className="mt-0.5 shrink-0 text-slate" />
              <div>
                <p className="text-sm font-medium text-obsidian">Cumulative %</p>
                <p className="mt-0.5 text-xs text-slate">
                  Running total of Share % from top to bottom; used for Pareto analysis — top intents covering 80% of
                  volume are the priority focus.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <TrendingUp size={16} className="mt-0.5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-obsidian">Avg Sentiment</p>
                <p className="mt-0.5 text-xs text-slate">
                  Average of call_sentiment (−1, 0, +1) for calls of this intent. Range −1 to +1. &gt;0.1 = positive,
                  &lt;−0.1 = negative.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-obsidian">Escalation %</p>
                <p className="mt-0.5 text-xs text-slate">
                  escalation_flag = 'Yes' ÷ total × 100. Benchmark ≤10%. Red if above threshold — indicates agent
                  unable to resolve independently.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <RefreshCw size={16} className="mt-0.5 shrink-0 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-obsidian">Repeat Call %</p>
                <p className="mt-0.5 text-xs text-slate">
                  repeatcall_flag = 'Yes' ÷ total × 100. Customer called back for the same issue. Red &gt;20%, amber
                  10–20%.
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : sortedRows.length === 0 ? (
          <table className="mt-4 w-full text-sm">
            <tbody>
              <tr>
                <td colSpan={7}>
                  <EmptyState title="No intent data" description="No data available for this period." />
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate">
                <th className="pb-2">Intent</th>
                <th className="pb-2">Calls</th>
                <th className="pb-2">Share</th>
                <th className="pb-2">Cumulative</th>
                <th className="pb-2">Avg Sentiment</th>
                <th className="pb-2">Escalation %</th>
                <th className="pb-2">Repeat Call %</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, i) => (
                <tr key={row.intent} className="border-t border-silver hover:bg-bone">
                  <td className="py-2">
                    <span className="mr-1.5 text-xs text-slate">#{i + 1}</span>
                    <span className="font-medium text-obsidian">{row.intent}</span>
                  </td>
                  <td className="py-2 font-medium text-slate">{num(row.count)}</td>
                  <td className="py-2 text-emerald-600">{num(row.pct).toFixed(1)}%</td>
                  <td className="py-2 text-slate">{num(row.cumulative_pct).toFixed(1)}%</td>
                  <td className={`py-2 font-medium ${sentimentClass(num(row.avg_sentiment))}`}>
                    {num(row.avg_sentiment).toFixed(2)}
                  </td>
                  <td className={`py-2 font-medium ${escalationClass(num(row.escalation_pct))}`}>
                    {num(row.escalation_pct).toFixed(1)}%
                  </td>
                  <td className={`py-2 font-medium ${repeatCallClass(num(row.repeat_call_pct))}`}>
                    {num(row.repeat_call_pct).toFixed(1)}%
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

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, AlertTriangle, TrendingUp } from 'lucide-react';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import { useDataFabric } from '../lib/dataFabric';
import { getDfTriggerWordCount } from '../api/dataFabricQueries';
import { num } from '../utils/num';

const BRAND_COLOR = '#6366F1';
const HIGH_RISK_WORDS = new Set(['lawyer', 'fraud', 'lawsuit', 'sue', 'legal', 'attorney']);

export default function TriggerWordsPage() {
  const { entities } = useDataFabric();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  interface TriggerWordRow { word: string; count: number; pct_of_calls: number; }

  const counts = useQuery({
    queryKey: ['df-trigger-words'],
    queryFn: async (): Promise<TriggerWordRow[]> => {
      const data = await getDfTriggerWordCount(entities);
      return data.map((r) => ({
        word: String(r.word ?? ''),
        count: Number(r.count ?? 0),
        pct_of_calls: Number(r.pct_of_calls ?? 0),
      }));
    },
  });

  const countsRows = counts.data ?? [];
  // Trigger word trend not available in DF — render empty
  const trendRows: Record<string, unknown>[] = [];

  const countsLoading = counts.isLoading;
  const trendLoading = false;

  const totalFlags = countsRows.reduce((sum, r) => sum + num(r.count), 0);
  const highRiskTotal = countsRows
    .filter((r) => HIGH_RISK_WORDS.has(r.word.toLowerCase()))
    .reduce((sum, r) => sum + num(r.count), 0);

  const barData = countsRows.map((r) => ({
    label: r.word,
    value: num(r.count),
  }));

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
          How are trigger word metrics calculated?
          {showMetricInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showMetricInfo && (
          <div className="mt-3 space-y-3 rounded-xl border border-silver bg-bone p-4 text-xs">
            <div className="flex gap-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-obsidian">Trigger Word Counts</p>
                <p className="mt-0.5 text-slate">
                  Words pre-defined as high-risk indicators detected in call transcripts via NLP tagging.{' '}
                  <span className="font-mono text-amber-700">count</span> = total occurrences across all calls in the
                  period; <span className="font-mono text-amber-700">% of calls</span> = calls containing the word ÷
                  total calls × 100. High counts signal potential escalation risk, compliance exposure, or customer
                  dissatisfaction patterns.
                </p>
              </div>
            </div>
            <div className="border-t border-silver pt-3 flex gap-3">
              <TrendingUp size={14} className="mt-0.5 shrink-0 text-purple-600" />
              <div>
                <p className="font-semibold text-obsidian">Monthly Trend</p>
                <p className="mt-0.5 text-slate">
                  Total trigger word occurrences per month. Rising trends may indicate deteriorating customer sentiment,
                  emerging product or policy issues, or insufficient agent de-escalation training.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-silver bg-paper px-4 py-3">
          <p className="text-xs text-slate">Total Flags</p>
          <p className="mt-1 text-2xl font-bold text-obsidian">{totalFlags.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-slate">this period</p>
        </div>
        <div className="rounded-xl border border-silver bg-paper px-4 py-3">
          <p className="text-xs text-slate">Unique Words</p>
          <p className="mt-1 text-2xl font-bold text-obsidian">{countsRows.length}</p>
          <p className="mt-0.5 text-xs text-slate">flagged terms</p>
        </div>
        <div className="rounded-xl border border-silver bg-paper px-4 py-3">
          <p className="text-xs text-slate">High-Risk Flags</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{highRiskTotal.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-slate">legal / fraud terms</p>
        </div>
        <div className="rounded-xl border border-silver bg-paper px-4 py-3">
          <p className="text-xs text-slate">Top Word</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {countsRows[0]?.word ?? '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate">
            {countsRows[0] ? `${num(countsRows[0].count).toLocaleString()} occurrences` : 'no data'}
          </p>
        </div>
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassPanel
          title="Top Trigger Words"
          subtitle="Occurrences this period — sorted by count"
          tooltip="Words flagged by the NLP pipeline as high-risk. Bars show raw occurrence count; hover for detail. Words associated with legal or fraud exposure appear in red when above the alert threshold."
        >
          {countsLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : countsRows.length === 0 ? (
            <EmptyState title="No trigger word data" description="No flagged words detected for this period." />
          ) : (
            <>
              <HorizontalBarChart
                data={barData}
                color={BRAND_COLOR}
                valueFormatter={(v) => v.toLocaleString()}
              />
              <ChartInsight
                prompt={`Analyse the top trigger words detected in calls. Which words are most concerning from a risk or compliance standpoint? What patterns do they reveal about customer sentiment and what actions should be taken? Data: ${JSON.stringify(countsRows)}`}
                cacheKey="trigger-word-counts"
              />
            </>
          )}
        </GlassPanel>

        <GlassPanel
          title="Trigger Word Trend"
          subtitle="Monthly total occurrences"
          tooltip="Total trigger word detections per month. Spikes may indicate a product issue, policy change, or external event driving customer frustration. Use alongside the escalation and sentiment trends to confirm root cause."
        >
          {trendLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <TrendLineChart
                data={trendRows}
                series={[{ dataKey: 'trigger_count', label: 'Trigger Flags', stroke: BRAND_COLOR }]}
                yFormatter={(v) => v.toLocaleString()}
              />
              <ChartInsight
                prompt={`Analyse the monthly trend of trigger word detections. Is the volume rising or falling? What months show spikes and what are the likely operational causes? What interventions would reduce trigger word frequency? Data: ${JSON.stringify(trendRows)}`}
                cacheKey="trigger-word-trend"
              />
            </>
          )}
        </GlassPanel>
      </div>

      {/* Detail table */}
      <GlassPanel title="Trigger Word Breakdown" subtitle="All flagged terms ranked by occurrence">
        {countsLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : countsRows.length === 0 ? (
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td colSpan={4}>
                  <EmptyState title="No trigger word data" description="No data available for this period." />
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-silver text-left text-xs uppercase tracking-wide text-slate">
                <th className="py-2 pr-4">Word</th>
                <th className="py-2 pr-4 text-right">Occurrences</th>
                <th className="py-2 pr-4 text-right">% of Calls</th>
                <th className="py-2 text-right">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {countsRows.map((r) => {
                const isHighRisk = HIGH_RISK_WORDS.has(r.word.toLowerCase());
                return (
                  <tr key={r.word} className="border-b border-silver hover:bg-bone">
                    <td className="py-2 pr-4 font-medium text-obsidian">{r.word}</td>
                    <td className="py-2 pr-4 text-right text-graphite">{num(r.count).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-graphite">{num(r.pct_of_calls).toFixed(1)}%</td>
                    <td className="py-2 text-right">
                      {isHighRisk ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          High Risk
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          Monitor
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

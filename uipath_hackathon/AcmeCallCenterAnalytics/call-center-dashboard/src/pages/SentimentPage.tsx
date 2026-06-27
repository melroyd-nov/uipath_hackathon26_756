import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import lottieWave from '../assets/lottie/icon-wave.json';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import SentimentTrendChart from '../components/charts/SentimentTrendChart';
import AgentSentimentChart from '../components/charts/AgentSentimentChart';
import SentimentDonutChart from '../components/charts/SentimentDonutChart';
import { useFilters } from '../context/FilterContext';
import { useDataFabric } from '../lib/dataFabric';
import { getDfSentimentTrend, getDfAgentSummary } from '../api/dataFabricQueries';
import type { SentimentMonthlyPoint } from '../api/dashboard';
import { num } from '../utils/num';

function negPctClass(pct: number): string {
  if (pct > 30) return 'text-status-escalated';
  if (pct >= 15) return 'text-status-hold';
  return 'text-status-live';
}

function avgScoreClass(score: number): string {
  if (score > 0.1) return 'text-status-live';
  if (score < -0.1) return 'text-status-escalated';
  return 'text-status-hold';
}

export default function SentimentPage() {
  const { startDate, endDate } = useFilters();
  const filters = { start_date: startDate, end_date: endDate };
  const { entities } = useDataFabric();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  const trend = useQuery({
    queryKey: ['df-sentiment-trend'],
    queryFn: async (): Promise<SentimentMonthlyPoint[]> => {
      const data = await getDfSentimentTrend(entities);
      return data as unknown as SentimentMonthlyPoint[];
    },
  });

  const byAgent = useQuery({
    queryKey: ['df-agent-summary'],
    queryFn: () => getDfAgentSummary(entities),
  });

  const trendData = trend.data ?? [];
  // Map agent summary to the shape the JSX expects
  const agentRows = (byAgent.data ?? []).map((row) => ({
    agent: row.agent,
    total_calls: row.call_count,
    positive_count: null,
    neutral_count: null,
    negative_count: null,
    negative_pct: row.negative_pct,
    avg_sentiment: row.avg_sentiment,
  }));
  const trendLoading = trend.isLoading;
  const byAgentLoading = byAgent.isLoading;

  const nssMonthly = useMemo(
    () => trendData.map((d) => ({ month: d.month, avg_score: Math.round(num(d.avg_score) * 1000) / 1000 })),
    [trendData],
  );

  const sentimentShareMonthly = useMemo(
    () =>
      trendData.map((d) => {
        const positive = num(d.positive_count);
        const neutral = num(d.neutral_count);
        const negative = num(d.negative_count);
        const total = positive + neutral + negative || 1;
        return {
          month: d.month,
          positive_pct: Math.round((positive / total) * 1000) / 10,
          neutral_pct: Math.round((neutral / total) * 1000) / 10,
          negative_pct: Math.round((negative / total) * 1000) / 10,
        };
      }),
    [trendData],
  );

  const sentimentTotals = useMemo(() => {
    const totals = trendData.reduce(
      (acc: { positive: number; neutral: number; negative: number }, d) => {
        acc.positive += num(d.positive_count);
        acc.neutral += num(d.neutral_count);
        acc.negative += num(d.negative_count);
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 },
    );
    const total = totals.positive + totals.neutral + totals.negative || 1;
    return {
      positive_count: totals.positive,
      neutral_count: totals.neutral,
      negative_count: totals.negative,
      positive_pct: Math.round((totals.positive / total) * 1000) / 10,
      neutral_pct: Math.round((totals.neutral / total) * 1000) / 10,
      negative_pct: Math.round((totals.negative / total) * 1000) / 10,
    };
  }, [trendData]);

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
          How are sentiment metrics calculated?
          {showMetricInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showMetricInfo && (
          <div className="mt-3 divide-y divide-silver rounded-xl border border-silver bg-bone p-4">
            <div className="flex gap-3 pb-3">
              <TrendingUp size={16} className="mt-0.5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-obsidian">Positive / Neutral / Negative</p>
                <p className="mt-0.5 text-xs text-slate">
                  Each call is rated at analysis time: +1 = Positive, 0 = Neutral, −1 = Negative, stored in
                  <code className="mx-1 rounded bg-bone px-1">call_sentiment</code>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 py-3">
              <Minus size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-obsidian">Mean Sentiment Score</p>
                <p className="mt-0.5 text-xs text-slate">
                  Sum of per-call sentiment scores ÷ total calls. Range −1.0 to +1.0. &gt;0.1 = positive, &lt;−0.1 =
                  negative, between = neutral. Target ≥ 0.1.
                </p>
              </div>
            </div>
            <div className="flex gap-3 py-3">
              <TrendingDown size={16} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-obsidian">Negative % (Agent Table)</p>
                <p className="mt-0.5 text-xs text-slate">
                  Negative calls ÷ total calls × 100, per agent. Color: &gt;30% red, 15–30% amber, &lt;15% green.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-3">
              <Minus size={16} className="mt-0.5 shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-obsidian">Avg Score (Agent Table)</p>
                <p className="mt-0.5 text-xs text-slate">
                  Mean of call_sentiment (−1/0/+1) per agent. &gt;0.1 positive, &lt;−0.1 negative, else neutral.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassPanel title="Mean Sentiment Score" subtitle="Monthly average of per-call sentiment (−1 to +1)" lottieIcon={lottieWave} accent="#10B981">
          {trendLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <SentimentTrendChart data={trendData} />
              <ChartInsight
                prompt={`Analyse the monthly Mean Sentiment Score trend. Which months show concerning mean sentiment, what is the direction of change, and what actions would you recommend? Data: ${JSON.stringify(nssMonthly)}`}
                cacheKey={`sentiment-trend-${JSON.stringify(filters)}`}
              />
            </>
          )}
        </GlassPanel>

        <GlassPanel title="Monthly Sentiment Share" subtitle="Negative / Neutral / Positive % per month" lottieIcon={lottieWave} accent="#10B981">
          {trendLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <AgentSentimentChart data={trendData} />
              <ChartInsight
                prompt={`Analyse the monthly sentiment percentage share. Which month had the worst negative sentiment share, what trend is visible, and what could be driving the changes? Data: ${JSON.stringify(sentimentShareMonthly)}`}
                cacheKey={`sentiment-share-${JSON.stringify(filters)}`}
              />
            </>
          )}
        </GlassPanel>

        <GlassPanel title="Overall Sentiment Distribution" subtitle="Aggregated across all months" lottieIcon={lottieWave} accent="#10B981">
          {trendLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <SentimentDonutChart data={trendData} />
              <ChartInsight
                prompt={`Based on the overall call sentiment distribution, assess customer satisfaction. Is the negative rate acceptable? What are the top recommendations to shift sentiment positively? Data: ${JSON.stringify(sentimentTotals)}`}
                cacheKey={`sentiment-donut-${JSON.stringify(filters)}`}
              />
            </>
          )}
        </GlassPanel>
      </div>

      <GlassPanel title="Agent Sentiment Breakdown" lottieIcon={lottieWave} accent="#10B981">
        {byAgentLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : agentRows.length === 0 ? (
          <EmptyState title="No agent sentiment data" description="No data available for this period." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate">
                <th className="pb-2">Agent</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Positive</th>
                <th className="pb-2">Neutral</th>
                <th className="pb-2">Negative</th>
                <th className="pb-2">Neg %</th>
                <th className="pb-2">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {agentRows.map((row) => (
                <tr key={row.agent} className="border-t border-silver hover:bg-bone">
                  <td className="py-2 font-medium text-obsidian">{row.agent}</td>
                  <td className="py-2 text-slate">{num(row.total_calls)}</td>
                  <td className="py-2 text-emerald-500">{num(row.positive_count)}</td>
                  <td className="py-2 text-slate">{num(row.neutral_count)}</td>
                  <td className="py-2 text-red-500">{num(row.negative_count)}</td>
                  <td className={`py-2 font-medium ${negPctClass(num(row.negative_pct))}`}>
                    {num(row.negative_pct).toFixed(1)}%
                  </td>
                  <td className={`py-2 font-medium ${avgScoreClass(num(row.avg_sentiment))}`}>
                    {num(row.avg_sentiment).toFixed(3)}
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

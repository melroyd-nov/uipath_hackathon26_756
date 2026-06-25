import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, Target, TrendingUp, Star, Users } from 'lucide-react';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import { useDataFabric } from '../lib/dataFabric';
import { getDfIntentSummary } from '../api/dataFabricQueries';
import { num } from '../utils/num';

const BRAND_COLOR = '#6366F1';
const HIGH_CONVERSION_THRESHOLD = 70;

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  Upsell:     { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Cross-sell': { bg: 'bg-blue-100',   text: 'text-blue-700' },
  Retention:  { bg: 'bg-amber-100',  text: 'text-amber-700' },
  Referral:   { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

function conversionColor(score: number): string {
  if (score >= HIGH_CONVERSION_THRESHOLD) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function sentimentLabel(s: number): { label: string; className: string } {
  if (s > 0.1) return { label: 'Positive', className: 'text-emerald-600' };
  if (s < -0.1) return { label: 'Negative', className: 'text-red-600' };
  return { label: 'Neutral', className: 'text-amber-600' };
}

export default function MarketingPage() {
  const { entities } = useDataFabric();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  interface MarketingRow {
    intent: string;
    call_count: number;
    opportunity_type: string;
    avg_sentiment: number;
    positive_sentiment_pct: number;
    conversion_score: number;
    is_marketing: boolean;
  }

  const opps = useQuery({
    queryKey: ['df-intent-summary-marketing'],
    queryFn: async (): Promise<MarketingRow[]> => {
      const all = await getDfIntentSummary(entities);
      return all
        .filter((r) => r.is_marketing === true)
        .map((r) => ({
          intent: String(r.intent ?? ''),
          call_count: Number(r.count ?? 0),
          opportunity_type: String(r.opportunity_type ?? ''),
          avg_sentiment: Number(r.avg_sentiment ?? 0),
          positive_sentiment_pct: Number(r.positive_sentiment_pct ?? 0),
          conversion_score: Number(r.conversion_score ?? 0),
          is_marketing: true,
        }));
    },
  });

  const rows = opps.data ?? [];
  const isLoading = opps.isLoading;

  const totalCalls = rows.reduce((sum, r) => sum + num(r.call_count), 0);
  const highConversionCount = rows.filter((r) => num(r.conversion_score) >= HIGH_CONVERSION_THRESHOLD).length;
  const avgConversion = rows.length
    ? rows.reduce((sum, r) => sum + num(r.conversion_score), 0) / rows.length
    : 0;

  const typeAgg = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.opportunity_type] = (acc[r.opportunity_type] ?? 0) + num(r.call_count);
    return acc;
  }, {});
  const typeBarData = Object.entries(typeAgg)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  const intentBarData = [...rows]
    .sort((a, b) => num(b.call_count) - num(a.call_count))
    .slice(0, 8)
    .map((r) => ({ label: r.intent, value: num(r.call_count) }));

  const conversionBarData = [...rows]
    .sort((a, b) => num(b.conversion_score) - num(a.conversion_score))
    .slice(0, 8)
    .map((r) => ({ label: r.intent, value: num(r.conversion_score) }));

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
          How are marketing opportunity metrics calculated?
          {showMetricInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showMetricInfo && (
          <div className="mt-3 space-y-3 rounded-xl border border-silver bg-bone p-4 text-xs">
            <div className="flex gap-3">
              <Target size={14} className="mt-0.5 shrink-0 text-purple-600" />
              <div>
                <p className="font-semibold text-obsidian">Opportunity Detection</p>
                <p className="mt-0.5 text-slate">
                  Calls are classified as marketing opportunities when NLP intent detection identifies buying signals:
                  upgrade intent, cross-sell receptivity, renewal risk, or referral willingness.{' '}
                  <span className="font-mono text-amber-700">call_count</span> = total calls flagged with that intent in
                  the period.
                </p>
              </div>
            </div>
            <div className="border-t border-silver pt-3 flex gap-3">
              <Star size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-obsidian">Conversion Score</p>
                <p className="mt-0.5 text-slate">
                  Composite 0–100 score combining positive sentiment %, absence of escalation, and intent strength.
                  Thresholds:{' '}
                  <span className="text-emerald-600">≥70 = High</span>,{' '}
                  <span className="text-amber-600">50–69 = Medium</span>,{' '}
                  <span className="text-red-600">&lt;50 = Low</span>.
                </p>
              </div>
            </div>
            <div className="border-t border-silver pt-3 flex gap-3">
              <TrendingUp size={14} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-obsidian">Opportunity Types</p>
                <p className="mt-0.5 text-slate">
                  <span className="text-purple-600 font-medium">Upsell</span> — customer expressed interest in a higher tier or additional volume.{' '}
                  <span className="text-blue-600 font-medium">Cross-sell</span> — interest in a complementary product or service.{' '}
                  <span className="text-amber-600 font-medium">Retention</span> — churn risk with re-engagement potential.{' '}
                  <span className="text-emerald-600 font-medium">Referral</span> — customer indicated willingness to refer others.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-silver bg-paper px-4 py-3">
          <p className="text-xs text-slate">Opportunity Calls</p>
          <p className="mt-1 text-2xl font-bold text-obsidian">{totalCalls.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-slate">this period</p>
        </div>
        <div className="rounded-xl border border-silver bg-paper px-4 py-3">
          <p className="text-xs text-slate">Unique Intents</p>
          <p className="mt-1 text-2xl font-bold text-obsidian">{rows.length}</p>
          <p className="mt-0.5 text-xs text-slate">opportunity types</p>
        </div>
        <div className="rounded-xl border border-silver bg-paper px-4 py-3">
          <p className="text-xs text-slate">High-Conversion</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{highConversionCount}</p>
          <p className="mt-0.5 text-xs text-slate">intents scoring ≥70</p>
        </div>
        <div className="rounded-xl border border-silver bg-paper px-4 py-3">
          <p className="text-xs text-slate">Avg Conversion Score</p>
          <p className={`mt-1 text-2xl font-bold ${conversionColor(avgConversion)}`}>
            {avgConversion > 0 ? avgConversion.toFixed(1) : '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate">across all intents</p>
        </div>
      </div>

      {/* Opportunity type summary */}
      <GlassPanel
        title="Opportunity Type Breakdown"
        subtitle="Call volume by opportunity category"
        tooltip="Grouped view of all opportunity calls by category. Each bar shows total calls where that opportunity type was detected. Use this to understand which opportunity channels have the most volume."
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : typeBarData.length === 0 ? (
          <EmptyState title="No opportunity data" description="No marketing opportunities detected for this period." />
        ) : (
          <>
            <HorizontalBarChart
              data={typeBarData}
              color={BRAND_COLOR}
              valueFormatter={(v) => v.toLocaleString()}
            />
            <ChartInsight
              prompt={`Analyse the marketing opportunity breakdown by type. Which opportunity type (Upsell, Cross-sell, Retention, Referral) has the highest call volume? What does this distribution reveal about customer behaviour and where should the marketing team focus? Data: ${JSON.stringify(typeBarData)}`}
              cacheKey="marketing-type-breakdown"
            />
          </>
        )}
      </GlassPanel>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassPanel
          title="Top Opportunity Intents"
          subtitle="Call volume by intent — top 8"
          tooltip="The call intents most frequently associated with marketing opportunities. Higher call count means more customers with buying signals for that intent — prioritise outreach and agent scripting for these intents."
        >
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : intentBarData.length === 0 ? (
            <EmptyState title="No data" description="No opportunity intents found for this period." />
          ) : (
            <>
              <HorizontalBarChart
                data={intentBarData}
                color={BRAND_COLOR}
                valueFormatter={(v) => v.toLocaleString()}
              />
              <ChartInsight
                prompt={`Which call intents drive the most marketing opportunity volume? Among the top intents, what are the most actionable next steps for sales or marketing teams to convert these signals? Data: ${JSON.stringify(intentBarData)}`}
                cacheKey="marketing-intent-volume"
              />
            </>
          )}
        </GlassPanel>

        <GlassPanel
          title="Conversion Score by Intent"
          subtitle="Likelihood to convert — benchmark: 70"
          tooltip="Conversion score (0–100) per intent: green ≥70 (high), amber 50–69 (medium), red <50 (low). Focus outreach resources on high-volume intents that also carry a high conversion score."
        >
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : conversionBarData.length === 0 ? (
            <EmptyState title="No data" description="No conversion scores available." />
          ) : (
            <>
              <HorizontalBarChart
                data={conversionBarData}
                color={BRAND_COLOR}
                benchmark={HIGH_CONVERSION_THRESHOLD}
                benchmarkLabel="70 (high)"
                benchmarkColor="#34D399"
                aboveBenchmarkColor="#34D399"
                valueFormatter={(v) => v.toFixed(0)}
              />
              <ChartInsight
                prompt={`Analyse the conversion scores for each marketing opportunity intent. Which intents have the highest conversion potential (score ≥70) and which are underperforming? What actions would improve conversion rates for medium and low-scoring intents? Data: ${JSON.stringify(conversionBarData)}`}
                cacheKey="marketing-conversion-score"
              />
            </>
          )}
        </GlassPanel>
      </div>

      {/* Detail table */}
      <GlassPanel title="All Marketing Opportunities" subtitle="Ranked by conversion score">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : rows.length === 0 ? (
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td colSpan={6}>
                  <EmptyState title="No marketing opportunity data" description="No opportunities detected for this period." />
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-silver text-left text-xs uppercase tracking-wide text-slate">
                <th className="py-2 pr-4">Intent</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4 text-right">Calls</th>
                <th className="py-2 pr-4 text-right">Pos. Sentiment</th>
                <th className="py-2 pr-4 text-right">Avg Sentiment</th>
                <th className="py-2 text-right">Conversion Score</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => num(b.conversion_score) - num(a.conversion_score))
                .map((r) => {
                  const typeStyle = TYPE_STYLES[r.opportunity_type] ?? { bg: 'bg-bone', text: 'text-slate' };
                  const sentiment = sentimentLabel(num(r.avg_sentiment));
                  return (
                    <tr key={r.intent} className="border-b border-silver hover:bg-bone">
                      <td className="py-2 pr-4 font-medium text-obsidian">{r.intent}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${typeStyle.bg} ${typeStyle.text}`}>
                          {r.opportunity_type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right text-graphite">{num(r.call_count).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right text-emerald-600">{num(r.positive_sentiment_pct).toFixed(1)}%</td>
                      <td className={`py-2 pr-4 text-right text-xs font-medium ${sentiment.className}`}>
                        {num(r.avg_sentiment).toFixed(2)} ({sentiment.label})
                      </td>
                      <td className={`py-2 text-right font-bold ${conversionColor(num(r.conversion_score))}`}>
                        {num(r.conversion_score).toFixed(0)}
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

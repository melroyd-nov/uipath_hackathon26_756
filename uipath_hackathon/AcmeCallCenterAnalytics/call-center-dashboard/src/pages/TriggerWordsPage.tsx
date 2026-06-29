import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Zap, Hash, ShieldAlert } from 'lucide-react';
import lottieZap from '../assets/lottie/icon-zap.json';
import FilterBar from '../components/shared/FilterBar';
import GlassPanel from '../components/shared/GlassPanel';
import KpiHeroCard from '../components/dashboard/KpiHeroCard';
import ChartInsight from '../components/shared/ChartInsight';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import { useDataFabric } from '../lib/dataFabric';
import { getDfTriggerWordCount, getDfKpiTrends } from '../api/dataFabricQueries';
import { num } from '../utils/num';

const BRAND_COLOR = '#6366F1';
const HIGH_RISK_WORDS = new Set(['lawyer', 'fraud', 'lawsuit', 'sue', 'legal', 'attorney']);

interface TriggerWordRow { word: string; count: number; pct_of_calls: number; }

/* ─── colour palette: dark forest-green → olive → amber (matches reference) ── */
const CLOUD_PALETTE = [
  '#1a3d0a', '#2c5e18', '#3d7a24', '#4f8f2f',
  '#6b7c18', '#8a7e1a', '#a8941c', '#bf6e0e',
];

const CW = 700, CH = 220; // SVG viewport dimensions

interface PlacedWord {
  word: string; x: number; y: number; fontSize: number; rotation: number;
  color: string; count: number; pct_of_calls: number; isHighRisk: boolean;
  x1: number; y1: number; x2: number; y2: number;
}

function cloudRotation(word: string, idx: number): number {
  const hash = word.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const table = [0, 0, 0, 0, 90, -90, 0, 0, 0, 0, 90, 0, 0, -90, 0, 0];
  return table[(hash + idx * 3) % table.length];
}

/**
 * Archimedean spiral word-cloud layout.
 * Words are sorted large→small, then placed outward from the centre along a
 * tight spiral until a non-overlapping spot is found. No library needed.
 */
function computeCloudLayout(rows: TriggerWordRow[], highRiskWords: Set<string>): PlacedWord[] {
  const placed: PlacedWord[] = [];
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  if (!sorted.length) return placed;

  const counts = sorted.map((r) => r.count);
  const minC = Math.min(...counts), maxC = Math.max(...counts);
  const rng = maxC - minC || 1;

  for (let idx = 0; idx < sorted.length; idx++) {
    const r = sorted[idx];
    const isHighRisk = highRiskWords.has(r.word.toLowerCase());
    const norm = (r.count - minC) / rng;
    const fontSize = Math.round(12 + norm * 44);
    const rotation = isHighRisk ? 0 : cloudRotation(r.word, idx);
    const color = isHighRisk
      ? '#c0392b'
      : CLOUD_PALETTE[Math.round((1 - norm) * (CLOUD_PALETTE.length - 1))];

    // Estimate rendered bounding box from character metrics
    const tw = r.word.length * fontSize * 0.58;
    const th = fontSize * 1.1;

    // Axis-aligned bounding box after rotation
    const rad = (rotation * Math.PI) / 180;
    const cosA = Math.abs(Math.cos(rad)), sinA = Math.abs(Math.sin(rad));
    const bbW = tw * cosA + th * sinA + 6;
    const bbH = tw * sinA + th * cosA + 4;

    // Walk the Archimedean spiral: cx = K·θ·cos(θ), cy = K·θ·sin(θ)·aspect
    const K = 1.6;       // controls how tight the spiral coils are
    const STEP = 0.08;   // angular step — smaller = denser packing
    let theta = 0;
    let placed_ok = false;

    while (theta < 500 * Math.PI) {
      const radius = K * theta;
      const cx = Math.cos(theta) * radius;
      const cy = Math.sin(theta) * radius * 0.50; // squash vertically → wide blob

      // Skip if outside SVG bounds
      if (Math.abs(cx) + bbW / 2 > CW / 2 - 4 || Math.abs(cy) + bbH / 2 > CH / 2 - 4) {
        theta += STEP; continue;
      }

      const x1 = cx - bbW / 2, y1 = cy - bbH / 2;
      const x2 = cx + bbW / 2, y2 = cy + bbH / 2;

      // AABB collision against every already-placed word
      let hit = false;
      for (const p of placed) {
        if (x1 < p.x2 && x2 > p.x1 && y1 < p.y2 && y2 > p.y1) { hit = true; break; }
      }

      if (!hit) {
        placed.push({
          word: r.word, x: cx, y: cy, fontSize, rotation, color,
          count: r.count, pct_of_calls: r.pct_of_calls, isHighRisk,
          x1, y1, x2, y2,
        });
        placed_ok = true;
        break;
      }
      theta += STEP;
    }

    // If a word truly can't be placed (canvas too small), skip it silently
    if (!placed_ok) { /* intentionally empty */ }
  }

  return placed;
}

function WordCloud({ rows, highRiskWords }: { rows: TriggerWordRow[]; highRiskWords: Set<string> }) {
  const [hovered, setHovered] = useState<PlacedWord | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Recompute layout only when source data changes
  const cloud = useMemo(() => computeCloudLayout(rows, highRiskWords), [rows, highRiskWords]);

  return (
    <div className="relative" onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}>
      <svg
        width="100%"
        viewBox={`${-CW / 2} ${-CH / 2} ${CW} ${CH}`}
        style={{ display: 'block', minHeight: 180 }}
        aria-label="Trigger word cloud"
      >
        {cloud.map((p) => (
          <text
            key={p.word}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={p.fontSize}
            fontFamily="Poppins, Inter, sans-serif"
            fontWeight="800"
            fill={p.color}
            transform={p.rotation !== 0 ? `rotate(${p.rotation},${p.x},${p.y})` : undefined}
            style={{ cursor: 'default', userSelect: 'none' }}
            onMouseEnter={() => setHovered(p)}
            onMouseLeave={() => setHovered(null)}
          >
            {p.word}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-1 mb-2 flex w-full justify-center gap-6 text-[11px] text-slate">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#c0392b]" />
          High Risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#3d7a24]" />
          Monitor
        </span>
        <span className="flex items-center gap-1.5 italic text-slate/60">
          Size = frequency
        </span>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="pointer-events-none fixed z-50 rounded-xl border border-white/20 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-md"
          style={{
            left: pos.x + 14,
            top: pos.y - 90,
            background: 'rgba(10,20,10,0.93)',
            minWidth: 148,
          }}
        >
          <p className="text-[13px] font-bold text-white">{hovered.word}</p>
          <p className="mt-1 text-[11px] text-white/70">
            <span className="font-semibold text-amber-400">{hovered.count.toLocaleString()}</span> occurrences
          </p>
          <p className="text-[11px] text-white/70">
            <span className="font-semibold text-emerald-400">{hovered.pct_of_calls.toFixed(1)}%</span> of calls
          </p>
          {hovered.isHighRisk && (
            <p className="mt-1 rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
              ⚠ High Risk
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TriggerWordsPage() {
  const { entities } = useDataFabric();
  const [showMetricInfo, setShowMetricInfo] = useState(false);

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

  const kpiTrends = useQuery({
    queryKey: ['df-kpi-trends'],
    queryFn: () => getDfKpiTrends(entities),
  });

  const countsRows = counts.data ?? [];
  const trendRows = (kpiTrends.data ?? []).map((r) => ({
    month: r.month,
    trigger_count: r.trigger_count,
  }));

  const countsLoading = counts.isLoading;
  const trendLoading = kpiTrends.isLoading;

  const totalFlags = countsRows.reduce((sum, r) => sum + num(r.count), 0);
  const highRiskTotal = countsRows
    .filter((r) => HIGH_RISK_WORDS.has(r.word.toLowerCase()))
    .reduce((sum, r) => sum + num(r.count), 0);

  const barData = [...countsRows]
    .sort((a, b) => num(b.count) - num(a.count))
    .slice(0, 5)
    .map((r) => ({ label: r.word, value: num(r.count) }));

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiHeroCard
          label="Total Flags"
          value={totalFlags.toLocaleString()}
          icon={Zap}
          accent="amber"
          status="neutral"
          footer="this period"
          sparkline={trendRows.map((r) => num(r.trigger_count))}
          delay={0}
          compact
          tooltip="Total trigger word occurrences detected across all calls in the selected period. Used as the baseline for all trigger-word percentage metrics."
        />
        <KpiHeroCard
          label="Unique Words"
          value={countsRows.length.toString()}
          icon={Hash}
          accent="indigo"
          status="neutral"
          footer="flagged terms"
          delay={0.07}
          compact
          tooltip="Number of distinct trigger words detected across all calls in the period. A higher count indicates broader language risk exposure."
        />
        <KpiHeroCard
          label="High-Risk Flags"
          value={highRiskTotal.toLocaleString()}
          icon={ShieldAlert}
          accent="rose"
          status={highRiskTotal > 0 ? 'critical' : 'good'}
          footer="legal / fraud terms"
          delay={0.14}
          compact
          tooltip="Occurrences of high-risk terms (lawyer, fraud, lawsuit, sue, legal, attorney). These require immediate supervisor review and may indicate regulatory exposure."
        />
        <KpiHeroCard
          label="Top Word"
          value={countsRows[0]?.word ?? '—'}
          icon={TrendingUp}
          accent="emerald"
          status="neutral"
          footer={countsRows[0] ? `${num(countsRows[0].count).toLocaleString()} occurrences` : 'no data'}
          delay={0.21}
          compact
          tooltip="The single most frequently occurring trigger word this period. Focus de-escalation and compliance training on reducing usage of this term."
        />
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <GlassPanel
          title="Top Trigger Words"
          subtitle="Occurrences this period — sorted by count"
          lottieIcon={lottieZap}
          accent="#F59E0B"
          fillHeight
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
          lottieIcon={lottieZap}
          accent="#F59E0B"
          fillHeight
          tooltip="Total trigger word detections per month. Spikes may indicate a product issue, policy change, or external event driving customer frustration. Use alongside the escalation and sentiment trends to confirm root cause."
        >
          {trendLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={28} />
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-[200px]">
                <TrendLineChart
                  data={trendRows}
                  xDataKey="month"
                  height="100%"
                  series={[{ dataKey: 'trigger_count', label: 'Trigger Flags', stroke: BRAND_COLOR }]}
                  yFormatter={(v) => v.toLocaleString()}
                />
              </div>
              <ChartInsight
                prompt={`Analyse the monthly trend of trigger word detections. Is the volume rising or falling? What months show spikes and what are the likely operational causes? What interventions would reduce trigger word frequency? Data: ${JSON.stringify(trendRows)}`}
                cacheKey="trigger-word-trend"
              />
            </>
          )}
        </GlassPanel>
      </div>

      {/* Word cloud */}
      <GlassPanel title="Trigger Word Cloud" subtitle="Size = frequency · green shades = monitor · red = high-risk" lottieIcon={lottieZap} accent="#F59E0B">
        {countsLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : countsRows.length === 0 ? (
          <EmptyState title="No trigger word data" description="No data available for this period." />
        ) : (
          <WordCloud rows={countsRows} highRiskWords={HIGH_RISK_WORDS} />
        )}
      </GlassPanel>
    </div>
  );
}

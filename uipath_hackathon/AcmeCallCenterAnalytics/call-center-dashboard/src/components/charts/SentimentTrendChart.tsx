import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SentimentMonthlyPoint } from '../../api/dashboard';
import EmptyState from '../shared/EmptyState';

interface SentimentTrendChartProps {
  data: SentimentMonthlyPoint[];
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function zoneColor(score: number): string {
  if (score >= 0.1) return '#3DBB6C';
  if (score <= -0.1) return '#E05A4B';
  return '#F3C969';
}

function zoneLabel(score: number): string {
  if (score >= 0.1) return 'Positive';
  if (score <= -0.1) return 'Negative';
  return 'Neutral';
}

function DotShape(props: { cx?: number; cy?: number; payload?: { avg_score: number } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return <circle cx={cx} cy={cy} r={4} fill={zoneColor(payload.avg_score)} stroke="#fff" strokeWidth={1} />;
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: Record<string, unknown> }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  const score = num(p.avg_score);
  return (
    <div className="rounded-card border border-silver bg-paper p-3 text-xs shadow-card">
      <p className="font-medium text-obsidian">{label}</p>
      <p className="mt-1 text-slate">
        Mean score: <span className="font-medium text-obsidian">{score.toFixed(3)}</span> ({zoneLabel(score)})
      </p>
      <p className="mt-1 text-slate">Positive: {num(p.positive_count)}</p>
      <p className="text-slate">Neutral: {num(p.neutral_count)}</p>
      <p className="text-slate">Negative: {num(p.negative_count)}</p>
      <p className="mt-1 text-slate">Total calls: {num(p.total_calls)}</p>
    </div>
  );
}

export default function SentimentTrendChart({ data }: SentimentTrendChartProps) {
  if (data.length === 0) {
    return <EmptyState title="No sentiment trend data" description="No data available for this period." />;
  }

  const chartData = data.map((d) => ({
    month: String(d.month),
    avg_score: num(d.avg_score),
    positive_count: num(d.positive_count),
    neutral_count: num(d.neutral_count),
    negative_count: num(d.negative_count),
    total_calls: num(d.total_calls),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d6d6d6" />
        <ReferenceArea y1={0.1} y2={1} fill="#3DBB6C" fillOpacity={0.06} />
        <ReferenceArea y1={-0.1} y2={0.1} fill="#F3C969" fillOpacity={0.06} />
        <ReferenceArea y1={-1} y2={-0.1} fill="#E05A4B" fillOpacity={0.06} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7b7b7b' }} />
        <YAxis domain={[-1, 1]} tick={{ fontSize: 11, fill: '#7b7b7b' }} />
        <Tooltip content={<TrendTooltip />} />
        <Area type="monotone" dataKey="avg_score" fill="#60A5FA" fillOpacity={0.12} stroke="none" />
        <Line
          type="monotone"
          dataKey="avg_score"
          stroke="#60A5FA"
          strokeWidth={2}
          dot={<DotShape />}
          activeDot={<DotShape />}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

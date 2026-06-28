import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SentimentMonthlyPoint } from '../../api/dashboard';
import EmptyState from '../shared/EmptyState';

interface AgentSentimentChartProps {
  data: SentimentMonthlyPoint[];
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

interface ShareRow {
  month: string;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  total_calls: number;
}

function ShareTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: ShareRow }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-card border border-silver bg-paper p-3 text-xs shadow-card">
      <p className="font-medium text-obsidian">{label}</p>
      <p className="mt-1 text-slate">
        Positive: {p.positive_pct.toFixed(1)}% ({p.positive_count})
      </p>
      <p className="text-slate">
        Neutral: {p.neutral_pct.toFixed(1)}% ({p.neutral_count})
      </p>
      <p className="text-slate">
        Negative: {p.negative_pct.toFixed(1)}% ({p.negative_count})
      </p>
      <p className="mt-1 text-slate">Total calls: {p.total_calls}</p>
    </div>
  );
}

export default function AgentSentimentChart({ data }: AgentSentimentChartProps) {
  if (data.length === 0) {
    return <EmptyState title="No sentiment share data" description="No data available for this period." />;
  }

  const chartData: ShareRow[] = data.map((d) => {
    const positive = num(d.positive_count);
    const neutral = num(d.neutral_count);
    const negative = num(d.negative_count);
    const total = positive + neutral + negative || 1;
    return {
      month: String(d.month),
      positive_pct: (positive / total) * 100,
      neutral_pct: (neutral / total) * 100,
      negative_pct: (negative / total) * 100,
      positive_count: positive,
      neutral_count: neutral,
      negative_count: negative,
      total_calls: num(d.total_calls),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d6d6d6" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7b7b7b' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#7b7b7b' }} />
        <Tooltip content={<ShareTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} verticalAlign="bottom" iconType="square" iconSize={10} />
        <Bar dataKey="negative_pct" name="Negative" stackId="share" fill="#E05A4B" />
        <Bar dataKey="neutral_pct" name="Neutral" stackId="share" fill="#C0C0C0" />
        <Bar dataKey="positive_pct" name="Positive" stackId="share" fill="#3DBB6C" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

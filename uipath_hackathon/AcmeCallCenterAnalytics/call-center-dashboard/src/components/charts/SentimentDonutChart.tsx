import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SentimentMonthlyPoint } from '../../api/dashboard';
import EmptyState from '../shared/EmptyState';

interface SentimentDonutChartProps {
  data: SentimentMonthlyPoint[];
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const COLORS: Record<string, string> = {
  Positive: '#3DBB6C',
  Negative: '#E05A4B',
  Neutral: '#C0C0C0',
};

function renderLabel(props: { name?: string; percent?: number }) {
  const { name, percent } = props;
  if (!name || percent == null || percent < 0.03) return '';
  return `${name} ${(percent * 100).toFixed(0)}%`;
}

export default function SentimentDonutChart({ data }: SentimentDonutChartProps) {
  const totals = data.reduce(
    (acc, d) => {
      acc.positive += num(d.positive_count);
      acc.negative += num(d.negative_count);
      acc.neutral += num(d.neutral_count);
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 },
  );

  const total = totals.positive + totals.negative + totals.neutral;

  if (total === 0) {
    return <EmptyState title="No sentiment distribution data" description="No data available for this period." />;
  }

  const pieData = [
    { name: 'Positive', value: totals.positive },
    { name: 'Negative', value: totals.negative },
    { name: 'Neutral', value: totals.neutral },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          innerRadius={80}
          outerRadius={110}
          label={renderLabel}
          labelLine
        >
          {pieData.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const v = Number(value) || 0;
            return [`${v} (${((v / total) * 100).toFixed(1)}%)`, String(name)];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} verticalAlign="bottom" iconType="square" iconSize={10} />
      </PieChart>
    </ResponsiveContainer>
  );
}

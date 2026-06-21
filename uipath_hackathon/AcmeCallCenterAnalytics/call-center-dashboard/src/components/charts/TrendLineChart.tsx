import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import EmptyState from '../shared/EmptyState';

export interface TrendLineSeries {
  dataKey: string;
  label: string;
  stroke: string;
}

interface TrendLineChartProps<T> {
  data: T[];
  series: TrendLineSeries[];
  benchmark?: { value: number; label: string; color?: string };
  height?: number;
  yFormatter?: (value: number) => string;
}

function formatMonthLabel(raw: unknown): string {
  const value = String(raw ?? '');
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }).replace(' ', " '");
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function TrendLineChart<T extends { date?: unknown }>({
  data,
  series,
  benchmark,
  height = 260,
  yFormatter = (v) => `${v}%`,
}: TrendLineChartProps<T>) {
  if (data.length === 0) {
    return <EmptyState title="No trend data" description="No data available for this period." />;
  }

  const chartData = data.map((d) => ({ ...d, _label: formatMonthLabel(d.date) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <XAxis dataKey="_label" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => yFormatter(num(v))}
        />
        <Tooltip
          formatter={(value, name) => [yFormatter(num(value)), String(name)]}
          labelFormatter={(label) => String(label)}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#6B7280' }} />
        {benchmark && (
          <ReferenceLine
            y={benchmark.value}
            stroke={benchmark.color ?? '#F59E0B'}
            strokeDasharray="4 4"
            label={{ value: benchmark.label, position: 'insideTopRight', fill: benchmark.color ?? '#F59E0B', fontSize: 11 }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.label}
            stroke={s.stroke}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

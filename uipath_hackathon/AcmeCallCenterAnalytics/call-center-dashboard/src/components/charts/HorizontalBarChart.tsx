import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, LabelList, ResponsiveContainer, Cell } from 'recharts';
import EmptyState from '../shared/EmptyState';

export interface HorizontalBarDatum {
  label: string;
  value: number;
  count?: number;
  total?: number;
}

interface HorizontalBarChartProps {
  data: HorizontalBarDatum[];
  color: string;
  benchmark?: number;
  benchmarkLabel?: string;
  benchmarkColor?: string;
  aboveBenchmarkColor?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function HorizontalBarChart({
  data,
  color,
  benchmark,
  benchmarkLabel,
  benchmarkColor = '#F59E0B',
  aboveBenchmarkColor = '#EF4444',
  height,
  valueFormatter = (v) => `${v}%`,
}: HorizontalBarChartProps) {
  if (data.length === 0) {
    return <EmptyState title="No data" description="No data available for this period." />;
  }

  const maxLabelLength = data.reduce((max, row) => Math.max(max, row.label?.length ?? 0), 0);
  const yAxisWidth = Math.max(120, maxLabelLength * 7.5);
  const chartHeight = height ?? Math.max(220, data.length * 38);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 4 }}>
        <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={yAxisWidth}
          tick={{ fill: '#9CA3AF', fontSize: 11, textAnchor: 'end' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value, _name, item) => {
            const row = item?.payload as HorizontalBarDatum;
            if (row?.count != null && row?.total != null) {
              return [`${valueFormatter(num(value))} (${row.count}/${row.total})`, 'Value'];
            }
            return [valueFormatter(num(value)), 'Value'];
          }}
        />
        {benchmark != null && (
          <ReferenceLine
            x={benchmark}
            stroke={benchmarkColor}
            strokeDasharray="4 4"
            label={{ value: benchmarkLabel ?? `${benchmark}%`, position: 'top', fill: benchmarkColor, fontSize: 11 }}
          />
        )}
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={benchmark != null ? 24 : 22} opacity={0.85}>
          {data.map((row) => (
            <Cell key={row.label} fill={benchmark != null && num(row.value) > benchmark ? aboveBenchmarkColor : color} />
          ))}
          <LabelList dataKey="value" position="right" fill="#9CA3AF" fontSize={10} formatter={(v: unknown) => valueFormatter(num(v))} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { KpiTrendPoint } from '../../api/dashboard';

interface CallVolumeTrendChartProps {
  data: KpiTrendPoint[];
}

function formatMonth(raw: unknown): string {
  const s = String(raw ?? '');
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (!m) return s;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1)
    .toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function fmtK(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-[10px] border border-[rgba(15,31,76,0.10)] px-3 py-2 text-xs shadow-lg"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)' }}
    >
      <p className="mb-1 font-semibold text-[#0F1F4C]">{label}</p>
      <p className="text-[#3B82F6]">
        <span className="font-bold">{payload[0].value.toLocaleString()}</span>
        <span className="ml-1 text-[#6B7280]">calls</span>
      </p>
    </div>
  );
}

export default function CallVolumeTrendChart({ data }: CallVolumeTrendChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate">No call volume data for this period.</p>;
  }

  const chartData = data.map((d) => ({
    month: formatMonth(d.month),
    calls: Number(d.total_calls) || 0,
  }));

  const maxVal = Math.max(...chartData.map((d) => d.calls), 1);
  const peak = chartData.findIndex((d) => d.calls === maxVal);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        <defs>
          <linearGradient id="cv-bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity={1} />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id="cv-bar-peak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity={1} />
            <stop offset="100%" stopColor="#6D28D9" stopOpacity={0.85} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} stroke="rgba(15,31,76,0.06)" strokeDasharray="4 0" />

        <XAxis
          dataKey="month"
          tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
          axisLine={{ stroke: 'rgba(15,31,76,0.12)' }}
          tickLine={false}
          dy={6}
        />

        <YAxis
          tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmtK}
          width={36}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)', radius: 6 }} />

        <Bar dataKey="calls" radius={[6, 6, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill={i === peak ? 'url(#cv-bar-peak)' : 'url(#cv-bar-grad)'}
              opacity={i === peak ? 1 : 0.82}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

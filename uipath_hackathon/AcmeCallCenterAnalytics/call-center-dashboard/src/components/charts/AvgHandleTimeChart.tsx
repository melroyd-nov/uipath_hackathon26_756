import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { KpiTrendPoint } from '../../api/dashboard';

const TARGET_MIN = 6.5;

interface AvgHandleTimeChartProps {
  data: KpiTrendPoint[];
}

function formatMonth(raw: unknown): string {
  const s = String(raw ?? '');
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (!m) return s;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1)
    .toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const overTarget = val > TARGET_MIN;
  return (
    <div
      className="rounded-[10px] border border-[rgba(15,31,76,0.10)] px-3 py-2 text-xs shadow-lg"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)' }}
    >
      <p className="mb-1 font-semibold text-[#0F1F4C]">{label}</p>
      <p style={{ color: overTarget ? '#D97706' : '#10B981' }}>
        <span className="font-bold">{val.toFixed(1)}</span>
        <span className="ml-1 text-[#6B7280]">min</span>
      </p>
      <p className="mt-0.5 text-[10px] text-[#9CA3AF]">
        Target: {TARGET_MIN} min — {overTarget ? `+${(val - TARGET_MIN).toFixed(1)} over` : `${(TARGET_MIN - val).toFixed(1)} under`}
      </p>
    </div>
  );
}

function CustomDot(props: { cx?: number; cy?: number; payload?: { aht: number }; index?: number; dataLength?: number }) {
  const { cx, cy, payload, index, dataLength } = props;
  if (index !== (dataLength ?? 0) - 1 || !cx || !cy) return null;
  const over = (payload?.aht ?? 0) > TARGET_MIN;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={over ? '#F59E0B' : '#10B981'} stroke="white" strokeWidth={2} />
    </g>
  );
}

export default function AvgHandleTimeChart({ data }: AvgHandleTimeChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate">No handle-time data for this period.</p>;
  }

  const chartData = data.map((d) => ({
    month: formatMonth(d.month),
    aht: Number(d.avg_handle_time_min) || 0,
  }));

  const avg = chartData.reduce((s, d) => s + d.aht, 0) / chartData.length;
  const allVals = chartData.map((d) => d.aht);
  const yMin = Math.floor(Math.max(0, Math.min(...allVals) - 1));
  const yMax = Math.ceil(Math.max(...allVals) + 1);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="aht-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
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
          domain={[yMin, yMax]}
          tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}m`}
          width={36}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(245,158,11,0.25)', strokeWidth: 1 }} />

        {/* Target line */}
        <ReferenceLine
          y={TARGET_MIN}
          stroke="#10B981"
          strokeDasharray="5 4"
          strokeWidth={1.5}
          label={{
            value: `Target ${TARGET_MIN}m`,
            position: 'insideTopRight',
            fill: '#10B981',
            fontSize: 10,
            fontWeight: 600,
            dy: -4,
          }}
        />

        {/* Average line */}
        <ReferenceLine
          y={avg}
          stroke="#F59E0B"
          strokeDasharray="3 3"
          strokeWidth={1}
          label={{
            value: `Avg ${avg.toFixed(1)}m`,
            position: 'insideBottomRight',
            fill: '#D97706',
            fontSize: 10,
            dy: 4,
          }}
        />

        <Area
          type="monotone"
          dataKey="aht"
          fill="url(#aht-area-grad)"
          stroke="none"
        />

        <Line
          type="monotone"
          dataKey="aht"
          stroke="#F59E0B"
          strokeWidth={2.5}
          dot={(props) => <CustomDot {...props} dataLength={chartData.length} />}
          activeDot={{ r: 5, fill: '#F59E0B', stroke: 'white', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

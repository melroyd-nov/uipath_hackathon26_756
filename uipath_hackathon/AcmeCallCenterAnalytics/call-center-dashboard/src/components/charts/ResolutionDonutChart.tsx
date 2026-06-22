import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ResolutionOverview } from '../../api/analytics';
import EmptyState from '../shared/EmptyState';
import { num } from '../../utils/num';

interface ResolutionDonutChartProps {
  data: ResolutionOverview | null | undefined;
}

const SLICES = [
  { key: 'resolved_count' as const, name: 'Resolved', color: '#34D399' },
  { key: 'unresolved_count' as const, name: 'Unresolved', color: '#EF4444' },
];

interface OutsideLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
  payload?: { color?: string };
}

function OutsideLabel({ cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, name, payload }: OutsideLabelProps) {
  const RADIAN = Math.PI / 180;
  const pct = Math.round(percent * 1000) / 10;
  if (pct < 3) return null;

  const color = payload?.color ?? '#7B7B7B';
  const cos = Math.cos(-midAngle * RADIAN);
  const sin = Math.sin(-midAngle * RADIAN);
  const sx = cx + (outerRadius + 6) * cos;
  const sy = cy + (outerRadius + 6) * sin;
  const ex = cx + (outerRadius + 20) * cos;
  const ey = cy + (outerRadius + 20) * sin;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={1.2} opacity={0.7} />
      <text x={ex} y={ey - 6} textAnchor={textAnchor} fontSize={11} fontWeight={600} fill={color}>
        {name}
      </text>
      <text x={ex} y={ey + 7} textAnchor={textAnchor} fontSize={10} fill="#7B7B7B">
        {pct}%
      </text>
    </g>
  );
}

interface TooltipEntry {
  value: number;
  name: string;
  payload: { color: string; pct: number };
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-card border border-silver bg-paper px-3 py-2 text-xs shadow-card">
      <div className="mb-1 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: p.payload.color }} />
        <span className="font-medium text-obsidian">{p.name}</span>
      </div>
      <p className="text-slate">
        {p.value} calls ({p.payload.pct}%)
      </p>
    </div>
  );
}

export default function ResolutionDonutChart({ data }: ResolutionDonutChartProps) {
  if (!data || (data.resolved_count === 0 && data.unresolved_count === 0)) {
    return <EmptyState title="No resolution data" description="No data available for this period." />;
  }

  const total = num(data.resolved_count) + num(data.unresolved_count) || 1;
  const pieData = SLICES.map((s) => ({
    ...s,
    value: num(data[s.key]),
    pct: Math.round((num(data[s.key]) / total) * 1000) / 10,
  }));

  const resolutionPct = data.resolution_pct != null ? num(data.resolution_pct).toFixed(1) : '—';

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={72}
            outerRadius={100}
            dataKey="value"
            paddingAngle={3}
            strokeWidth={0}
            labelLine={false}
            label={<OutsideLabel />}
          >
            {pieData.map((slice) => (
              <Cell key={slice.name} fill={slice.color} opacity={0.9} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        style={{ marginTop: -8 }}
      >
        <span className="text-3xl font-bold text-obsidian">{resolutionPct}%</span>
        <span className="mt-0.5 text-xs text-slate">Resolved</span>
        <span className="mt-1 text-xs text-amber-600">Benchmark: ≥80%</span>
      </div>
    </div>
  );
}

import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import type { EscalationByAgent } from '../../api/analytics';
import EmptyState from '../shared/EmptyState';

interface EscalationByAgentChartProps {
  data: EscalationByAgent[];
  benchmark?: number;
}

const BRAND_COLOR = '#6366F1';
const ABOVE_BENCHMARK_COLOR = '#EF4444';

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function AgentTooltip({ active, payload }: { active?: boolean; payload?: { payload: EscalationByAgent }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-card border border-silver bg-paper px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-obsidian">{row.agent_name}</p>
      <p className="text-slate">
        Escalation Rate: <span className="font-medium text-obsidian">{num(row.escalation_pct).toFixed(1)}%</span>
      </p>
      <p className="text-slate">
        Escalated Calls:{' '}
        <span className="font-medium text-obsidian">
          {num(row.escalation_count)} / {num(row.total_calls)}
        </span>
      </p>
    </div>
  );
}

export default function EscalationByAgentChart({ data, benchmark = 10 }: EscalationByAgentChartProps) {
  if (data.length === 0) {
    return <EmptyState title="No escalation data" description="No data available for this period." />;
  }

  const maxLabelLength = data.reduce((max, row) => Math.max(max, row.agent_name?.length ?? 0), 0);
  const yAxisWidth = Math.max(100, maxLabelLength * 7.5);
  const height = Math.max(240, data.length * 44 + 20);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <XAxis
          type="number"
          tick={{ fill: '#6B7280', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="agent_name"
          width={yAxisWidth}
          tick={{ fill: '#9CA3AF', fontSize: 11, textAnchor: 'end' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<AgentTooltip />} />
        <ReferenceLine
          x={benchmark}
          stroke="#F59E0B"
          strokeDasharray="4 4"
          label={{ value: `${benchmark}%`, position: 'top', fill: '#F59E0B', fontSize: 11 }}
        />
        <Bar dataKey="escalation_pct" radius={[0, 4, 4, 0]} maxBarSize={24} opacity={0.85}>
          {data.map((row) => (
            <Cell key={row.agent_name} fill={num(row.escalation_pct) > benchmark ? ABOVE_BENCHMARK_COLOR : BRAND_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

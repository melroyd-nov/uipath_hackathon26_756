import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import type { ComplianceByAgent } from '../../api/analytics';
import EmptyState from '../shared/EmptyState';
import { num } from '../../utils/num';

interface ComplianceByAgentChartProps {
  data: ComplianceByAgent[];
  benchmark?: number;
}

const BRAND_COLOR = '#6366F1';
const ABOVE_BENCHMARK_COLOR = '#EF4444';

function AgentTooltip({ active, payload }: { active?: boolean; payload?: { payload: ComplianceByAgent }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-card border border-silver bg-paper px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-obsidian">{row.agent_name}</p>
      <p className="text-slate">
        Fail Rate: <span className="font-medium text-obsidian">{num(row.compliance_fail_pct).toFixed(1)}%</span>
      </p>
      <p className="text-slate">
        Failed Calls:{' '}
        <span className="font-medium text-obsidian">
          {num(row.fail_count)} / {num(row.total_calls)}
        </span>
      </p>
    </div>
  );
}

export default function ComplianceByAgentChart({ data, benchmark = 5 }: ComplianceByAgentChartProps) {
  if (data.length === 0) {
    return <EmptyState title="No compliance data" description="No data available for this period." />;
  }

  const maxLabelLength = data.reduce((max, row) => Math.max(max, row.agent_name?.length ?? 0), 0);
  const yAxisWidth = Math.max(100, maxLabelLength * 7.5);
  const height = Math.max(240, data.length * 44 + 20);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, left: 0, bottom: 0 }}>
        <XAxis
          type="number"
          domain={[0, 'auto']}
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="agent_name"
          width={yAxisWidth}
          tick={{ fill: '#9CA3AF', fontSize: 12, textAnchor: 'end' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<AgentTooltip />} />
        <ReferenceLine
          x={benchmark}
          stroke="#F59E0B"
          strokeDasharray="4 4"
          label={{ value: `${benchmark}%`, position: 'top', fill: '#F59E0B', fontSize: 10 }}
        />
        <Bar dataKey="compliance_fail_pct" name="Compliance Fail %" radius={[0, 4, 4, 0]} maxBarSize={24} opacity={0.85}>
          {data.map((row) => (
            <Cell
              key={row.agent_name}
              fill={num(row.compliance_fail_pct) > benchmark ? ABOVE_BENCHMARK_COLOR : BRAND_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

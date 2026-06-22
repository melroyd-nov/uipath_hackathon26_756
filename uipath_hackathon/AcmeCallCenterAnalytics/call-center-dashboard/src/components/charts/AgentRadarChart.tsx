import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { AgentKpi } from '../../api/agents';

const BRAND_COLOR = '#6366F1';

interface AgentRadarChartProps {
  kpi: AgentKpi;
  agentName: string;
}

export default function AgentRadarChart({ kpi, agentName }: AgentRadarChartProps) {
  const data = [
    { metric: 'Resolution',     value: Math.min(kpi.resolution_pct ?? 0, 100),                benchmark: 80 },
    { metric: 'Pre-Verified',   value: Math.min(kpi.preverified_pct ?? 0, 100),               benchmark: 80 },
    { metric: 'Non-Escalation', value: Math.max(0, 100 - (kpi.escalation_pct ?? 0)),          benchmark: 90 },
    { metric: 'Compliance',     value: Math.max(0, 100 - (kpi.compliance_fail_pct ?? 0)),     benchmark: 95 },
    { metric: 'No Repeat',      value: Math.max(0, 100 - (kpi.repeat_call_pct ?? 0)),         benchmark: 80 },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#fff' }}
          formatter={(v: unknown) => [typeof v === 'number' ? `${v.toFixed(1)}%` : String(v), '']}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        <Radar
          name="Benchmark"
          dataKey="benchmark"
          stroke="#F59E0B"
          fill="#F59E0B"
          fillOpacity={0.05}
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <Radar
          name={agentName}
          dataKey="value"
          stroke={BRAND_COLOR}
          fill={BRAND_COLOR}
          fillOpacity={0.2}
          strokeWidth={2}
          dot={{ r: 3, fill: '#150958' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

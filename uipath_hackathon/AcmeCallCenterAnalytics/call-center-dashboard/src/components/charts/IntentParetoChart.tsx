import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, ResponsiveContainer, Cell } from 'recharts';
import type { IntentPareto } from '../../api/analytics';
import EmptyState from '../shared/EmptyState';

interface IntentParetoChartProps {
  data: IntentPareto[];
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const DARK_COLORS = ['#818CF8', '#6366F1', '#A78BFA', '#C084FC', '#60A5FA', '#C084FC', '#D8B4FE', '#E9D5FF', '#F472B6', '#FB923C'];
const LIGHT_COLORS = ['#150958', '#3B2FA0', '#6366F1', '#818CF8', '#60A5FA', '#818CF8', '#A78BFA', '#C084FC', '#F472B6', '#FB923C'];

function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

function ParetoTooltip({ active, payload }: { active?: boolean; payload?: { payload: IntentPareto }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const sentiment = num(row.avg_sentiment);
  const escalation = num(row.escalation_pct);

  return (
    <div className="rounded-card border border-silver bg-paper px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-obsidian">{row.intent}</p>
      <p className="text-slate">Calls: <span className="font-medium text-obsidian">{num(row.count)}</span></p>
      <p className="text-slate">Share: <span className="font-medium text-obsidian">{num(row.pct).toFixed(1)}%</span></p>
      <p className="text-slate">
        Avg Sentiment:{' '}
        <span className={sentiment > 0 ? 'font-medium text-emerald-500' : sentiment < 0 ? 'font-medium text-red-500' : 'font-medium text-slate'}>
          {sentiment.toFixed(2)}
        </span>
      </p>
      <p className="text-slate">
        Escalation %:{' '}
        <span className={escalation > 10 ? 'font-medium text-red-500' : 'font-medium text-emerald-500'}>
          {escalation.toFixed(1)}%
        </span>
      </p>
    </div>
  );
}

export default function IntentParetoChart({ data }: IntentParetoChartProps) {
  const isDark = useIsDarkTheme();

  if (data.length === 0) {
    return <EmptyState title="No intent data" description="No data available for this period." />;
  }

  const sorted = [...data].sort((a, b) => num(b.count) - num(a.count));
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const height = Math.max(260, sorted.length * 38);
  const maxLabelLength = sorted.reduce((max, row) => Math.max(max, row.intent?.length ?? 0), 0);
  const yAxisWidth = Math.max(180, maxLabelLength * 7.5);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 4 }}>
        <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="intent"
          width={yAxisWidth}
          tick={{ fill: '#9CA3AF', fontSize: 11, textAnchor: 'end' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ParetoTooltip />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28} opacity={0.85}>
          {sorted.map((row, i) => (
            <Cell key={row.intent} fill={colors[i % colors.length]} />
          ))}
          <LabelList dataKey="count" position="right" fill="#9CA3AF" fontSize={10} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

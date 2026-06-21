import type { KpiTrendPoint } from '../../api/dashboard';

interface CallVolumeTrendChartProps {
  data: KpiTrendPoint[];
}

export default function CallVolumeTrendChart({ data }: CallVolumeTrendChartProps) {
  const values = data.map((d) => Number(d.total_calls) || 0);
  const max = Math.max(...values, 1);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate">No call volume data for this period.</p>;
  }

  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((point, i) => {
        const value = values[i];
        const heightPct = Math.max((value / max) * 100, 3);
        return (
          <div key={point.month} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] text-slate">{value}</span>
            <div className="flex h-32 w-full items-end">
              <div
                className="w-full rounded-t-badge bg-sky-veil"
                style={{ height: `${heightPct}%` }}
                title={`${point.month}: ${value} calls`}
              />
            </div>
            <span className="truncate text-[11px] text-mist">{point.month}</span>
          </div>
        );
      })}
    </div>
  );
}

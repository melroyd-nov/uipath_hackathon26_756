import type { KpiTrendPoint } from '../../api/dashboard';

interface AvgHandleTimeChartProps {
  data: KpiTrendPoint[];
}

export default function AvgHandleTimeChart({ data }: AvgHandleTimeChartProps) {
  const values = data.map((d) => Number(d.avg_handle_time_min) || 0);
  const max = Math.max(...values, 1);
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const avgLinePct = max ? (average / max) * 100 : 0;

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate">No handle-time data for this period.</p>;
  }

  return (
    <div className="relative">
      <div
        className="absolute left-0 right-0 z-10 border-t border-dashed border-graphite"
        style={{ bottom: `calc(${avgLinePct}% * 0.8 + 20px)` }}
        title={`Average: ${average.toFixed(1)} min`}
      />
      <div className="flex h-48 items-end gap-2">
        {data.map((point, i) => {
          const value = values[i];
          const heightPct = Math.max((value / max) * 100, 3);
          return (
            <div key={point.month} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] text-slate">{value.toFixed(1)}</span>
              <div className="flex h-32 w-full items-end">
                <div
                  className="w-full rounded-t-badge bg-lilac-bloom"
                  style={{ height: `${heightPct}%` }}
                  title={`${point.month}: ${value.toFixed(1)} min`}
                />
              </div>
              <span className="truncate text-[11px] text-mist">{point.month}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-right text-[11px] text-slate">Avg: {average.toFixed(1)} min (dashed line)</p>
    </div>
  );
}

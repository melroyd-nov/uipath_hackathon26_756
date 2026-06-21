interface HealthGaugeProps {
  score: number;
  size?: number;
}

const TICKS = 20;

function colorForScore(score: number) {
  if (score >= 75) return '#7fd9a8';
  if (score >= 50) return '#f3c969';
  return '#ef9b8e';
}

export default function HealthGauge({ score, size = 180 }: HealthGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = colorForScore(clamped);
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;

  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const tickFraction = i / (TICKS - 1);
    const angle = Math.PI - tickFraction * Math.PI;
    const active = tickFraction <= clamped / 100;
    const x1 = cx + (radius - 6) * Math.cos(angle);
    const y1 = cy - (radius - 6) * Math.sin(angle);
    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy - radius * Math.sin(angle);
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={active ? color : '#d6d6d6'}
        strokeWidth={3}
        strokeLinecap="round"
      />
    );
  });

  return (
    <div className="relative mx-auto" style={{ width: size, height: size / 2 + 24 }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        {ticks}
      </svg>
      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
        <span className="font-editorial text-3xl text-obsidian">{Math.round(clamped)}</span>
        <span className="text-[11px] text-slate">/ 100</span>
      </div>
    </div>
  );
}

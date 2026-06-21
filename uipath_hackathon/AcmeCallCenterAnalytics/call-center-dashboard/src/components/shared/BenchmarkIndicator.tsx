type BenchmarkLevel = 'good' | 'warning' | 'bad';

interface BenchmarkIndicatorProps {
  level: BenchmarkLevel;
  label?: string;
}

const LEVEL_STYLES: Record<BenchmarkLevel, string> = {
  good: 'bg-status-live-bg text-status-live',
  warning: 'bg-status-hold-bg text-status-hold',
  bad: 'bg-status-escalated-bg text-status-escalated',
};

export default function BenchmarkIndicator({ level, label }: BenchmarkIndicatorProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium ${LEVEL_STYLES[level]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? level}
    </span>
  );
}

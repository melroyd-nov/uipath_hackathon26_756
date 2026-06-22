type AiBadgeVariant = 'live' | 'neutral';

interface AiBadgeProps {
  label: string;
  variant?: AiBadgeVariant;
}

const VARIANT_STYLES: Record<AiBadgeVariant, string> = {
  live: 'bg-status-live-bg text-status-live',
  neutral: 'bg-bone text-graphite',
};

export default function AiBadge({ label, variant = 'neutral' }: AiBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium ${VARIANT_STYLES[variant]}`}>
      {variant === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {label}
    </span>
  );
}

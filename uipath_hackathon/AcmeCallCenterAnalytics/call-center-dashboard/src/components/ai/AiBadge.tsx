type AiBadgeVariant = 'live' | 'neutral';

interface AiBadgeProps {
  label: string;
  variant?: AiBadgeVariant;
}

const VARIANT_STYLES: Record<AiBadgeVariant, string> = {
  live: 'bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]',
  neutral: 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]',
};

export default function AiBadge({ label, variant = 'neutral' }: AiBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${VARIANT_STYLES[variant]}`}>
      {variant === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {label}
    </span>
  );
}

import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { Info } from 'lucide-react';
import { motion } from 'framer-motion';

export type KpiStatus = 'good' | 'watch' | 'critical' | 'neutral';

const ACCENT_CONFIG: Record<string, { gradient: string; glow: string; shimmer: string }> = {
  // Total Calls — cosmic purple
  indigo: {
    gradient: 'linear-gradient(160deg,#0D0221 0%,#5E1F8C 50%,#A855F7 100%)',
    glow: '0 14px 40px rgba(168,85,247,0.42)',
    shimmer: 'rgba(168,85,247,0.18)',
  },
  // FCR — arctic blue
  emerald: {
    gradient: 'linear-gradient(160deg,#0C3547 0%,#0569A8 50%,#12C2E9 100%)',
    glow: '0 14px 40px rgba(18,194,233,0.40)',
    shimmer: 'rgba(18,194,233,0.18)',
  },
  // Sentiment — gold flame
  sky: {
    gradient: 'linear-gradient(160deg,#4A2800 0%,#C67C00 50%,#FFD200 100%)',
    glow: '0 14px 40px rgba(255,210,0,0.38)',
    shimmer: 'rgba(255,210,0,0.15)',
  },
  // Escalation — crimson depth
  rose: {
    gradient: 'linear-gradient(160deg,#3D0000 0%,#C94B4B 50%,#FF6B6B 100%)',
    glow: '0 14px 40px rgba(201,75,75,0.42)',
    shimmer: 'rgba(255,107,107,0.18)',
  },
  // Compliance — ocean indigo
  orange: {
    gradient: 'linear-gradient(160deg,#030D2A 0%,#143E6B 50%,#1E88E5 100%)',
    glow: '0 14px 40px rgba(30,136,229,0.40)',
    shimmer: 'rgba(30,136,229,0.18)',
  },
  // Pre-Verified — jungle green
  cyan: {
    gradient: 'linear-gradient(160deg,#012E1A 0%,#0A6B3A 50%,#34D399 100%)',
    glow: '0 14px 40px rgba(52,211,153,0.38)',
    shimmer: 'rgba(52,211,153,0.18)',
  },
  // Trigger Words — electric violet
  amber: {
    gradient: 'linear-gradient(160deg,#1A0638 0%,#4F1E8F 50%,#9333EA 100%)',
    glow: '0 14px 40px rgba(147,51,234,0.42)',
    shimmer: 'rgba(147,51,234,0.18)',
  },
  // Repeat Calls — rose gold (hero)
  violet: {
    gradient: 'linear-gradient(160deg,#4A0A2E 0%,#9B2460 50%,#F2A06A 100%)',
    glow: '0 14px 40px rgba(155,36,96,0.40)',
    shimmer: 'rgba(242,160,106,0.18)',
  },
};

const STATUS_LABELS: Record<KpiStatus, string> = {
  good: 'On Track',
  watch: 'Watch',
  critical: 'Critical',
  neutral: 'Neutral',
};

interface KpiHeroCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENT_CONFIG;
  status: KpiStatus;
  benchmark?: string;
  footer?: string;
  sparkline?: number[];
  delay?: number;
  tooltip?: string;
}

function Sparkline({ data, uid }: { data: number[]; uid: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 56;
  const H = 52;
  const pad = 4;
  const coords = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));
  const points = coords.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${coords[0].x},${coords[0].y}`,
    ...coords.slice(1).map((p) => `L ${p.x},${p.y}`),
    `L ${W},${H}`,
    `L 0,${H}`,
    'Z',
  ].join(' ');
  const gradId = `sfill-${uid}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke="rgba(255,255,255,0.80)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {(() => {
        const lastPt = points.split(' ').pop()!;
        const [lx, ly] = lastPt.split(',');
        return <circle cx={lx} cy={ly} r={2.5} fill="white" opacity={0.9} />;
      })()}
    </svg>
  );
}

function BarSpark({ data }: { data: number[] }) {
  const bars = data.slice(-8);
  const max = Math.max(...bars) || 1;
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 52 }}>
      {bars.map((v, i) => (
        <div
          key={i}
          className="w-[5px] rounded-[3px]"
          style={{
            height: `${Math.max(14, (v / max) * 52)}px`,
            background: i === bars.length - 1
              ? 'rgba(255,255,255,0.90)'
              : 'rgba(255,255,255,0.45)',
          }}
        />
      ))}
    </div>
  );
}

const cardVariants = {
  rest: { y: 0 },
  hover: { y: -5, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

const shimmerVariants = {
  rest: { x: '-120%', opacity: 0 },
  hover: {
    x: '220%',
    opacity: 1,
    transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
  },
};

export default function KpiHeroCard({
  label,
  value,
  icon: Icon,
  accent,
  status,
  benchmark,
  footer,
  sparkline,
  delay = 0,
  tooltip,
}: KpiHeroCardProps) {
  const uid = useId();
  const cfg = ACCENT_CONFIG[accent] ?? ACCENT_CONFIG.indigo;
  const useBarSpark = accent === 'sky' || accent === 'amber';
  const hasViz = sparkline && sparkline.length > 1;

  return (
    <div className="relative">
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.50, ease: [0.23, 1, 0.32, 1], delay }}
      variants={cardVariants}
      whileHover="hover"
      className="group relative overflow-hidden rounded-[24px] p-5"
      style={{
        background: cfg.gradient,
        boxShadow: cfg.glow,
        minHeight: 148,
      }}
    >
      {/* Shimmer sweep on hover */}
      <motion.div
        variants={shimmerVariants}
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(110deg, transparent 35%, ${cfg.shimmer} 50%, transparent 65%)`,
          zIndex: 1,
        }}
      />

      {/* Soft noise texture overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[24px] opacity-[0.04]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '160px',
        }}
      />

      <div className="relative z-10 flex h-full flex-col">
        {/* Top row: icon + badge */}
        <div className="flex items-start justify-between gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.14)]">
            <Icon size={14} className="text-white" />
          </span>
          <span
            className="rounded-full px-2.5 py-[3px] text-[9px] font-bold uppercase tracking-[0.11em] text-white"
            style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(4px)' }}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>

        {/* Main content: numeral left, viz right */}
        <div className="mt-3 flex flex-1 items-end justify-between gap-3">
          {/* Left: numeral + labels */}
          <div className="flex flex-col justify-end">
            <p
              className="text-[28px] font-semibold leading-none tracking-tight text-white"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {value}
            </p>
            <p className="mt-2.5 text-[11px] leading-tight text-[rgba(255,255,255,0.68)]">
              {label}
            </p>
            {(benchmark ?? footer) && (
              <p className="mt-0.5 text-[10px] text-[rgba(255,255,255,0.38)]">
                Target {benchmark ?? footer}
              </p>
            )}
          </div>

          {/* Right: sparkline / bar spark */}
          {hasViz && (
            <div className="shrink-0 self-end pb-0.5">
              {useBarSpark ? (
                <BarSpark data={sparkline!} />
              ) : (
                <Sparkline data={sparkline!} uid={uid} />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>

    {/* Tooltip trigger — lives outside overflow-hidden so it can escape the card */}
    {tooltip && (
      <div className="group/tip absolute top-3 right-3 z-10">
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 hover:bg-white/30 transition-colors"
        >
          <Info size={10} className="text-white/70" />
        </button>
        <div className="pointer-events-none absolute right-0 top-7 z-50 w-56 rounded-xl border border-white/10 bg-[#0D0D1F]/95 px-3 py-2.5 text-[11px] leading-relaxed text-white/80 opacity-0 shadow-2xl backdrop-blur-md transition-opacity duration-150 group-hover/tip:opacity-100">
          <div className="absolute -top-1.5 right-1.5 h-3 w-3 rotate-45 rounded-sm border-l border-t border-white/10 bg-[#0D0D1F]/95" />
          {tooltip}
        </div>
      </div>
    )}
    </div>
  );
}

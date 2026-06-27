import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Loader2, CheckCheck, AlarmClock, Percent } from 'lucide-react';
import lottieFlow from '../../assets/lottie/icon-flow.json';
import { motion } from 'framer-motion';
import GlassPanel from '../shared/GlassPanel';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useDataFabric, ENTITY_IDS } from '../../lib/dataFabric';

const TILES: {
  key: string;
  label: string;
  icon: typeof ClipboardList;
  isPercent?: boolean;
  gradient: string;
  glow: string;
  shimmer: string;
}[] = [
  {
    key: 'pending',
    label: 'Needs Review',
    icon: ClipboardList,
    gradient: 'linear-gradient(160deg,#4A2800 0%,#C67C00 50%,#F59E0B 100%)',
    glow: '0 14px 40px rgba(245,158,11,0.38)',
    shimmer: 'rgba(245,158,11,0.18)',
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: CheckCircle2,
    gradient: 'linear-gradient(160deg,#012E1A 0%,#0A6B3A 50%,#34D399 100%)',
    glow: '0 14px 40px rgba(52,211,153,0.38)',
    shimmer: 'rgba(52,211,153,0.18)',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    icon: Loader2,
    gradient: 'linear-gradient(160deg,#0C3547 0%,#0569A8 50%,#12C2E9 100%)',
    glow: '0 14px 40px rgba(18,194,233,0.40)',
    shimmer: 'rgba(18,194,233,0.18)',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCheck,
    gradient: 'linear-gradient(160deg,#0D0221 0%,#5E1F8C 50%,#A855F7 100%)',
    glow: '0 14px 40px rgba(168,85,247,0.42)',
    shimmer: 'rgba(168,85,247,0.18)',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    icon: AlarmClock,
    gradient: 'linear-gradient(160deg,#3D0000 0%,#C94B4B 50%,#FF6B6B 100%)',
    glow: '0 14px 40px rgba(201,75,75,0.42)',
    shimmer: 'rgba(255,107,107,0.18)',
  },
  {
    key: 'completion_rate',
    label: 'Completion',
    icon: Percent,
    isPercent: true,
    gradient: 'linear-gradient(160deg,#1A0638 0%,#4F1E8F 50%,#9333EA 100%)',
    glow: '0 14px 40px rgba(147,51,234,0.42)',
    shimmer: 'rgba(147,51,234,0.18)',
  },
];

const shimmerVariants = {
  rest: { x: '-120%', opacity: 0 },
  hover: {
    x: '220%',
    opacity: 1,
    transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
  },
};

export default function FollowupStatusWidget() {
  const { entities } = useDataFabric();

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['df-followups-summary'],
    queryFn: () => entities.getAllRecords(ENTITY_IDS.CallFollowup),
  });

  const allItems = rawData?.items ?? [];
  const STATUS_MAP: Record<number, string> = { 0: 'pending', 1: 'approved', 2: 'rejected', 3: 'in_progress', 4: 'completed' };
  const statuses = allItems.map((r) => STATUS_MAP[Number(r.status)] ?? 'pending');
  const completed = statuses.filter((s) => s === 'completed').length;
  const data: Record<string, number> = {
    pending: statuses.filter((s) => s === 'pending').length,
    approved: statuses.filter((s) => s === 'approved').length,
    in_progress: statuses.filter((s) => s === 'in_progress').length,
    completed,
    overdue: 0,
    completion_rate: allItems.length > 0 ? Math.round((completed / allItems.length) * 100) : 0,
  };

  return (
    <GlassPanel title="Follow-up Pipeline" accent="#8B5CF6" lottieIcon={lottieFlow}>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <LoadingSpinner size={24} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {TILES.map(({ key, label, icon: Icon, isPercent, gradient, glow, shimmer }, i) => {
            const raw = data[key] ?? 0;
            const display = isPercent ? `${Math.round(raw)}%` : String(raw);
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: i * 0.06 }}
                whileHover="hover"
                className="group relative"
              >
                <Link
                  to="/followups"
                  className="relative block overflow-hidden rounded-[18px] p-4"
                  style={{
                    background: gradient,
                    boxShadow: glow,
                    minHeight: 120,
                  }}
                >
                  {/* Shimmer sweep */}
                  <motion.div
                    variants={shimmerVariants}
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `linear-gradient(110deg, transparent 35%, ${shimmer} 50%, transparent 65%)`,
                      zIndex: 1,
                    }}
                  />

                  {/* Noise texture */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[18px] opacity-[0.04]"
                    style={{
                      backgroundImage:
                        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                      backgroundSize: '160px',
                    }}
                  />

                  <div className="relative z-10 flex h-full flex-col justify-between">
                    {/* Icon */}
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.14)]">
                      <Icon size={14} className="text-white" />
                    </span>

                    {/* Value + label */}
                    <div className="mt-3">
                      <p
                        className="text-[26px] font-semibold leading-none tracking-tight text-white tabular-nums"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        {display}
                      </p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.10em] text-[rgba(255,255,255,0.60)]">
                        {label}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Loader2, CheckCheck, AlarmClock, Percent } from 'lucide-react';
import GlassPanel from '../shared/GlassPanel';
import LoadingSpinner from '../shared/LoadingSpinner';
import { followupsApi } from '../../api/followups';

const TILES: { key: string; label: string; icon: typeof ClipboardList; isPercent?: boolean }[] = [
  { key: 'pending', label: 'Needs Review', icon: ClipboardList },
  { key: 'approved', label: 'Approved', icon: CheckCircle2 },
  { key: 'in_progress', label: 'In Progress', icon: Loader2 },
  { key: 'completed', label: 'Completed', icon: CheckCheck },
  { key: 'overdue', label: 'Overdue', icon: AlarmClock },
  { key: 'completion_rate', label: 'Completion %', icon: Percent, isPercent: true },
];

export default function FollowupStatusWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['followups-summary'],
    queryFn: followupsApi.summary,
  });

  return (
    <GlassPanel title="Follow-up Pipeline">
      {isLoading || !data ? (
        <div className="flex justify-center py-6">
          <LoadingSpinner size={24} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {TILES.map(({ key, label, icon: Icon, isPercent }) => {
            const raw = data[key as keyof typeof data] as number;
            const value = isPercent ? `${Math.round(raw)}%` : raw;
            return (
              <Link
                key={key}
                to="/followups"
                className="flex flex-col gap-1.5 rounded-card border border-silver bg-paper p-3 transition-colors hover:bg-bone"
              >
                <Icon size={16} className="text-slate" />
                <span className="font-editorial text-xl text-obsidian">{value}</span>
                <span className="text-[11px] text-slate">{label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}

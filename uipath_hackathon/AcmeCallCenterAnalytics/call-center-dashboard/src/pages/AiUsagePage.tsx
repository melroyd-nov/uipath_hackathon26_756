import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Gauge, RotateCcw, Clock, Cpu, Activity } from 'lucide-react';
import GlassPanel from '../components/shared/GlassPanel';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { getAiUsage, resetAiUsage } from '../api/ai';

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatTile({
  icon: Icon, label, value, color,
}: { icon: typeof Brain; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl px-4 py-3 border" style={{ backgroundColor: `${color}14`, borderColor: `${color}40` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={13} style={{ color }} />
        <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color }}>
          {label}
        </span>
      </div>
      <p className="text-2xl font-extrabold text-obsidian" style={{ fontFeatureSettings: "'tnum' 1" }}>
        {value}
      </p>
    </div>
  );
}

export default function AiUsagePage() {
  const queryClient = useQueryClient();

  const usageQuery = useQuery({
    queryKey: ['ai-usage'],
    queryFn: getAiUsage,
  });

  const resetMutation = useMutation({
    mutationFn: resetAiUsage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
    },
  });

  const usage = usageQuery.data;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-paper border border-silver p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gauge size={20} className="text-purple-600" />
              <h1 className="text-xl font-bold text-obsidian">AI Usage</h1>
            </div>
            <p className="text-slate text-xs">
              Tracks calls made to the Gemini-backed AI assistant — today&apos;s count and all-time total.
            </p>
          </div>
          <button
            type="button"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-graphite bg-bone hover:bg-silver border border-silver rounded-lg px-3 py-2 disabled:opacity-40 transition-colors"
          >
            <RotateCcw size={13} />
            {resetMutation.isPending ? 'Resetting…' : "Reset today's count"}
          </button>
        </div>
      </div>

      <GlassPanel title="Usage Summary" subtitle="Live counters from the ai_usage table">
        {usageQuery.isLoading || !usage ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <StatTile icon={Activity} label="Calls Today" value={usage.calls_today} color="#34D399" />
              <StatTile icon={Brain} label="Total Calls" value={usage.total_calls} color="#6366F1" />
              <StatTile icon={Cpu} label="Last Model" value={usage.last_model ?? '—'} color="#A78BFA" />
              <StatTile icon={Clock} label="Last Endpoint" value={usage.last_endpoint ?? '—'} color="#38BDF8" />
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-silver pt-4">
              <div className="flex items-center justify-between">
                <span className="text-slate">Period date</span>
                <span className="text-graphite font-mono text-xs">{usage.period_date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate">Last call at</span>
                <span className="text-graphite text-xs">{formatDateTime(usage.last_call_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate">Last reset at</span>
                <span className="text-graphite text-xs">{formatDateTime(usage.last_reset_at)}</span>
              </div>
            </div>
          </>
        )}

        {resetMutation.isError && (
          <p className="text-xs text-red-600 mt-3">Failed to reset usage — check that the backend is reachable.</p>
        )}
      </GlassPanel>
    </div>
  );
}

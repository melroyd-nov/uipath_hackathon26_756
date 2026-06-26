import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ListChecks, Search, AlertTriangle, ArrowUpRight, Sparkles, User,
  Smile, Frown, Meh, CheckCheck, ShieldAlert,
} from 'lucide-react';
import GlassPanel from '../components/shared/GlassPanel';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useDataFabric, ENTITY_IDS } from '../lib/dataFabric';
import type { GlobalFollowup, GlobalFollowupFilters, FollowupStatus } from '../api/followups';

const PAGE_SIZE = 25;

type StatusFilter = 'all' | FollowupStatus | 'overdue';

// Darker text-safe variant for each accent color, used wherever the color renders as text on a light surface.
const TEXT_COLOR: Record<string, string> = {
  '#F59E0B': '#B45309',
  '#38BDF8': '#0369A1',
  '#A78BFA': '#6D28D9',
  '#34D399': '#047857',
  '#9CA3AF': '#4B5563',
  '#EF4444': '#B91C1C',
  '#6366F1': '#4338CA',
};

const STATUS_META: Record<FollowupStatus, { label: string; color: string }> = {
  pending: { label: 'Needs Review', color: '#F59E0B' },
  approved: { label: 'Approved', color: '#38BDF8' },
  in_progress: { label: 'In Progress', color: '#A78BFA' },
  completed: { label: 'Completed', color: '#34D399' },
  rejected: { label: 'Rejected', color: '#9CA3AF' },
};

type FollowupSummaryShape = { total: number; pending: number; approved: number; in_progress: number; completed: number; rejected: number; overdue: number; completion_rate: number };

const STATUS_CHIPS: { value: StatusFilter; label: string; color: string; countKey: keyof FollowupSummaryShape }[] = [
  { value: 'all', label: 'All', color: '#9CA3AF', countKey: 'total' },
  { value: 'pending', label: 'Needs Review', color: '#F59E0B', countKey: 'pending' },
  { value: 'approved', label: 'Approved', color: '#38BDF8', countKey: 'approved' },
  { value: 'in_progress', label: 'In Progress', color: '#A78BFA', countKey: 'in_progress' },
  { value: 'completed', label: 'Completed', color: '#34D399', countKey: 'completed' },
  { value: 'rejected', label: 'Rejected', color: '#9CA3AF', countKey: 'rejected' },
  { value: 'overdue', label: 'Overdue', color: '#EF4444', countKey: 'overdue' },
];

const SUMMARY_TILES: { key: keyof FollowupSummaryShape; label: string; color: string; alert?: boolean; isPercent?: boolean }[] = [
  { key: 'total', label: 'Total', color: '#9CA3AF' },
  { key: 'pending', label: 'Needs Review', color: '#F59E0B' },
  { key: 'approved', label: 'Approved', color: '#38BDF8' },
  { key: 'in_progress', label: 'In Progress', color: '#A78BFA' },
  { key: 'completed', label: 'Completed', color: '#34D399' },
  { key: 'overdue', label: 'Overdue', color: '#EF4444', alert: true },
  { key: 'completion_rate', label: 'Completion Rate', color: '#6366F1', isPercent: true },
];

function SummaryTile({
  label, value, color, alert,
}: { label: string; value: string | number; color: string; alert?: boolean }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 border"
      style={{
        backgroundColor: `${color}14`,
        borderColor: alert ? `${color}55` : `${color}25`,
      }}
    >
      <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: TEXT_COLOR[color] ?? color }}>
        {label}
      </p>
      <p className="text-xl font-extrabold text-obsidian" style={{ fontFeatureSettings: "'tnum' 1" }}>
        {value}
      </p>
    </div>
  );
}

function FilterChip({
  label, color, count, active, onClick,
}: { label: string; color: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active ? '' : 'bg-bone border-silver text-slate'
      }`}
      style={
        active
          ? { backgroundColor: `${color}1F`, borderColor: `${color}55`, color: TEXT_COLOR[color] ?? color }
          : undefined
      }
    >
      {label}
      <span
        className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? '' : 'bg-silver text-graphite'}`}
        style={
          active
            ? { backgroundColor: color, color: '#0B0B12' }
            : undefined
        }
      >
        {count}
      </span>
    </button>
  );
}

function StatusPill({ status }: { status: FollowupStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: `${meta.color}1F`, color: TEXT_COLOR[meta.color] ?? meta.color }}
    >
      {meta.label}
    </span>
  );
}

function SourceDot({ source }: { source: 'ai_generated' | 'manual' }) {
  if (source === 'ai_generated') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-purple-700">
        <Sparkles size={11} /> AI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-blue-700">
      <User size={11} /> Manual
    </span>
  );
}

function OverduePill({ days }: { days: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
      <AlertTriangle size={11} />
      Overdue{days != null ? ` · ${days}d` : ''}
    </span>
  );
}

function SentimentChip({ value }: { value: number | null }) {
  if (value === 1) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
        <Smile size={10} /> Positive
      </span>
    );
  }
  if (value === -1) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-red-600">
        <Frown size={10} /> Negative
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate">
      <Meh size={10} /> Neutral
    </span>
  );
}

function OutcomeChips({ resolved, escalated }: { resolved: string | null; escalated: string | null }) {
  return (
    <>
      <span className={`inline-flex items-center gap-1 text-[11px] ${resolved === 'Yes' ? 'text-emerald-600' : 'text-slate'}`}>
        <CheckCheck size={10} /> {resolved === 'Yes' ? 'Resolved' : 'Unresolved'}
      </span>
      {escalated === 'Yes' && (
        <span className="inline-flex items-center gap-1 text-[11px] text-orange-600">
          <ShieldAlert size={10} /> Escalated
        </span>
      )}
    </>
  );
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function FollowupRow({ f }: { f: GlobalFollowup }) {
  const meta = STATUS_META[f.status];
  const intents = [f.call_intent1, f.call_intent2, f.call_intent3].filter(Boolean) as string[];
  const hasOutcomeRow = intents.length > 0 || f.call_resolved_flag || f.escalation_flag === 'Yes' || f.call_sentiment != null;

  return (
    <div
      className={`rounded-xl border flex overflow-hidden ${
        f.is_overdue
          ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60'
          : 'bg-paper border-silver'
      }`}
    >
      <div className="w-1 shrink-0" style={{ backgroundColor: meta.color }} />
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill status={f.status} />
            <SourceDot source={f.source} />
            {f.is_overdue && <OverduePill days={f.days_overdue} />}
            {f.priority && <span className="text-[11px] uppercase font-semibold text-slate">{f.priority}</span>}
          </div>
          <Link
            to={`/calls/${f.call_id}/followups`}
            state={{ from: '/followups' }}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 shrink-0"
          >
            Manage <ArrowUpRight size={12} />
          </Link>
        </div>

        <p className="text-[13px] leading-relaxed font-medium text-obsidian mb-2">{f.text}</p>

        <div
          className="grid gap-x-4 gap-y-1 text-xs text-slate mb-2"
          style={{ gridTemplateColumns: 'auto 1fr auto 1fr' }}
        >
          <span className="text-slate">Call</span>
          <span>
            <Link to={`/calls/${f.call_id}`} className="text-blue-600 hover:text-blue-700 font-mono">
              #{f.call_id}
            </Link>
            {' · '}
            {formatDate(f.call_date)}
          </span>
          <span className="text-slate">Agent</span>
          <span className="text-graphite">{f.agent_name ?? '—'}</span>
          <span className="text-slate">Caller</span>
          <span className="text-graphite">
            {f.caller_name ?? '—'}
            {f.policy_number && <span className="text-slate"> {f.policy_number}</span>}
          </span>
          {f.due_date && (
            <>
              <span className="text-slate">Due</span>
              <span className={f.is_overdue ? 'text-red-600' : 'text-graphite'}>
                {formatDate(f.due_date)}
                {f.is_overdue && f.days_overdue != null ? ` (${f.days_overdue}d late)` : ''}
              </span>
            </>
          )}
          {f.approved_by && (
            <>
              <span className="text-slate">Approved by</span>
              <span className="text-graphite">{f.approved_by}</span>
            </>
          )}
        </div>

        {hasOutcomeRow && (
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-silver">
            {intents.slice(0, 3).map((intent) => (
              <span key={intent} className="px-2 py-0.5 rounded-full text-[11px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                {intent}
              </span>
            ))}
            <SentimentChip value={f.call_sentiment} />
            <OutcomeChips resolved={f.call_resolved_flag} escalated={f.escalation_flag} />
          </div>
        )}
      </div>
    </div>
  );
}

const CONTROL_CLASS =
  'text-xs bg-paper border border-silver rounded-md focus:outline-none focus:border-emerald-500/40 px-3 py-1.5 text-graphite';

export default function FollowupsOverviewPage() {
  const { entities } = useDataFabric();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [agent, setAgent] = useState('');
  const [source, setSource] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  const withReset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const filters: GlobalFollowupFilters = {
    status: statusFilter === 'all' || statusFilter === 'overdue' ? null : statusFilter,
    overdue: statusFilter === 'overdue' ? true : null,
    source: source || null,
    priority: priority || null,
    agent: agent || null,
    search: search || null,
    page,
    limit: PAGE_SIZE,
  };

  const allFollowupsQuery = useQuery({
    queryKey: ['df-followups'],
    queryFn: () => entities.getAllRecords(ENTITY_IDS.CallFollowup),
  });

  const STATUS_MAP: Record<number, FollowupStatus> = { 0: 'pending', 1: 'approved', 2: 'rejected', 3: 'in_progress', 4: 'completed' };
  const SOURCE_MAP: Record<number, 'ai_generated' | 'manual'> = { 0: 'ai_generated', 1: 'manual' };
  const PRIORITY_MAP: Record<number, string> = { 0: 'low', 1: 'medium', 2: 'high' };

  const allItems: GlobalFollowup[] = (allFollowupsQuery.data?.items ?? []).map((r) => ({
    id: Number(r.Id ?? 0),
    call_id: Number(r.callid ?? 0),
    text: String(r.text ?? ''),
    reason: r.reason != null ? String(r.reason) : null,
    source: SOURCE_MAP[Number(r.source)] ?? 'ai_generated',
    status: STATUS_MAP[Number(r.status)] ?? 'pending',
    priority: r.priority != null ? (PRIORITY_MAP[Number(r.priority)] as 'low' | 'medium' | 'high') : null,
    assigned_to: r.assigned_to != null ? String(r.assigned_to) : null,
    due_date: r.due_date != null ? String(r.due_date) : null,
    approved_by: r.approved_by != null ? String(r.approved_by) : null,
    approved_at: r.approved_at != null ? String(r.approved_at) : null,
    completed_at: r.completed_at != null ? String(r.completed_at) : null,
    completion_notes: r.completion_notes != null ? String(r.completion_notes) : null,
    created_at: String(r.CreatedOn ?? ''),
    updated_at: String(r.ModifiedOn ?? ''),
    agent_name: null,
    call_date: null,
    is_overdue: false,
    days_overdue: null,
    caller_name: null,
    policy_number: null,
    call_intent1: null,
    call_intent2: null,
    call_intent3: null,
    call_summary: null,
    call_sentiment: null,
    escalation_flag: null,
    compliance_flag: null,
    call_resolved_flag: null,
  }));

  // Apply client-side filters
  const filteredItems = allItems.filter((f) => {
    if (filters.status && f.status !== filters.status) return false;
    if (filters.overdue && !f.is_overdue) return false;
    if (filters.source && f.source !== filters.source) return false;
    if (filters.priority && f.priority !== filters.priority) return false;
    if (filters.search && !f.text.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const total = filteredItems.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary: FollowupSummaryShape = {
    total: allItems.length,
    pending: allItems.filter((f) => f.status === 'pending').length,
    approved: allItems.filter((f) => f.status === 'approved').length,
    in_progress: allItems.filter((f) => f.status === 'in_progress').length,
    completed: allItems.filter((f) => f.status === 'completed').length,
    rejected: allItems.filter((f) => f.status === 'rejected').length,
    overdue: allItems.filter((f) => f.is_overdue).length,
    completion_rate: allItems.length > 0
      ? Math.round((allItems.filter((f) => f.status === 'completed').length / allItems.length) * 100)
      : 0,
  };

  const isLoading = allFollowupsQuery.isLoading;

  const hasActiveFilters = !!(search || agent || source || priority || statusFilter !== 'all');

  const clearFilters = () => {
    setSearch('');
    setAgent('');
    setSource('');
    setPriority('');
    setStatusFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header + summary tiles */}
      <div className="rounded-2xl bg-paper border border-silver p-5">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks size={20} className="text-emerald-600" />
          <h1 className="text-xl font-bold text-obsidian">Follow-ups Overview</h1>
        </div>
        <p className="text-slate text-xs mb-4">
          Review, approve and track every AI-suggested or supervisor-added follow-up across all calls.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {SUMMARY_TILES.map((tile) => {
            const raw = summary?.[tile.key] ?? 0;
            const value = tile.isPercent ? `${raw}%` : raw;
            return (
              <SummaryTile key={tile.key} label={tile.label} value={value} color={tile.color} alert={tile.alert} />
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <GlassPanel title="Filters">
        <div className="flex flex-wrap gap-2 mb-3">
          {STATUS_CHIPS.map((chip) => (
            <FilterChip
              key={chip.value}
              label={chip.label}
              color={chip.color}
              count={summary?.[chip.countKey] ?? 0}
              active={statusFilter === chip.value}
              onClick={() => withReset(setStatusFilter)(chip.value)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate" />
            <input
              type="text"
              value={search}
              onChange={(e) => withReset(setSearch)(e.target.value)}
              placeholder="Search follow-up text…"
              className={`${CONTROL_CLASS} pl-7 w-52`}
            />
          </div>
          <input
            type="text"
            value={agent}
            onChange={(e) => withReset(setAgent)(e.target.value)}
            placeholder="Agent name"
            className={`${CONTROL_CLASS} w-36`}
          />
          <select value={source} onChange={(e) => withReset(setSource)(e.target.value)} className={CONTROL_CLASS}>
            <option value="">Any source</option>
            <option value="ai_generated">AI suggested</option>
            <option value="manual">Manual</option>
          </select>
          <select value={priority} onChange={(e) => withReset(setPriority)(e.target.value)} className={CONTROL_CLASS}>
            <option value="">Any priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-slate hover:text-graphite transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </GlassPanel>

      {/* Results */}
      <GlassPanel title={isLoading ? 'Loading…' : `${total} follow-up${total === 1 ? '' : 's'}`} subtitle={`Page ${page} of ${pages}`}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate italic py-6 text-center">No follow-ups match the current filters.</p>
        ) : (
          <div className="space-y-3">
            {items.map((f) => (
              <FollowupRow key={f.id} f={f} />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-silver">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs text-slate hover:text-obsidian disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <span className="text-slate text-xs">
              {page} / {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="text-xs text-slate hover:text-obsidian disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

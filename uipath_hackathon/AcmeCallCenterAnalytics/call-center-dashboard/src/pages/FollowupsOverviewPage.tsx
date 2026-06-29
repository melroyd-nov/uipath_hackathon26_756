import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ListChecks, Search, AlertTriangle, ArrowUpRight, Sparkles, User,
  Smile, Frown, Meh, CheckCheck, ShieldAlert, Clock, Calendar,
  TrendingUp, ThumbsUp, Activity,
} from 'lucide-react';
import lottieFilter from '../assets/lottie/icon-filter.json';
import lottieFlow from '../assets/lottie/icon-flow.json';
import GlassPanel from '../components/shared/GlassPanel';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import KpiHeroCard from '../components/dashboard/KpiHeroCard';
import { useDataFabric, ENTITY_IDS } from '../lib/dataFabric';
import type { GlobalFollowup, GlobalFollowupFilters, FollowupStatus } from '../api/followups';

const PAGE_SIZE = 25;

type StatusFilter = 'all' | FollowupStatus | 'overdue';

// Darker text-safe variant for each accent color, used wherever the color renders as text on a light surface.
const TEXT_COLOR: Record<string, string> = {
  '#F59E0B': '#D97706',
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
  const hasChips = intents.length > 0 || f.call_sentiment != null || f.escalation_flag === 'Yes' || f.call_resolved_flag != null;

  const priorityStyle =
    f.priority === 'high' ? 'bg-red-50 text-red-600' :
    f.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
    'bg-bone text-slate';

  return (
    <div className={`group relative rounded-2xl bg-paper border transition-all duration-150 hover:shadow-card ${
      f.is_overdue ? 'border-red-300' : 'border-silver'
    }`}>
      {/* Left accent */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-sm"
        style={{ backgroundColor: f.is_overdue ? '#EF4444' : meta.color }}
      />

      <div className="pl-5 pr-4 pt-3.5 pb-3.5">
        {/* Top row: status + priority + manage */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill status={f.status} />
            {f.is_overdue && <OverduePill days={f.days_overdue} />}
            {f.priority && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${priorityStyle}`}>
                {f.priority}
              </span>
            )}
            <SourceDot source={f.source} />
          </div>
          <Link
            to={`/calls/${f.call_id}/followups`}
            state={{ from: '/followups' }}
            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Manage <ArrowUpRight size={11} />
          </Link>
        </div>

        {/* Task text */}
        <p className="text-[13px] font-semibold text-obsidian leading-snug mb-3">{f.text}</p>

        {/* Context strip */}
        <div className="flex items-center gap-3.5 flex-wrap text-[11px] text-slate">
          {f.agent_name && (
            <span className="flex items-center gap-1">
              <User size={10} className="shrink-0 text-mist" />
              {f.agent_name}
            </span>
          )}
          {f.call_id && (
            <Link to={`/calls/${f.call_id}`} className="font-mono text-blue-500 hover:text-blue-600 transition-colors">
              #{f.call_id}
            </Link>
          )}
          {f.caller_name && <span>{f.caller_name}</span>}
          {f.policy_number && <span className="font-mono text-mist">{f.policy_number}</span>}
          {f.call_date && (
            <span className="flex items-center gap-1">
              <Calendar size={10} className="shrink-0 text-mist" />
              {formatDate(f.call_date)}
            </span>
          )}
          {f.due_date && (
            <span className={`flex items-center gap-1 ${f.is_overdue ? 'text-red-500 font-semibold' : ''}`}>
              <Clock size={10} className="shrink-0" />
              {f.is_overdue && f.days_overdue != null
                ? `${f.days_overdue}d overdue`
                : `Due ${formatDate(f.due_date)}`}
            </span>
          )}
          {f.approved_by && <span>Approved · {f.approved_by}</span>}
        </div>

        {/* Chips row */}
        {hasChips && (
          <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-silver/60">
            {intents.map((intent) => (
              <span key={intent} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F3F0FF] text-purple-700">
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

  const allCallsQuery = useQuery({
    queryKey: ['df-call-records'],
    queryFn: () => entities.getAllRecords(ENTITY_IDS.CallRecord),
  });

  const STATUS_MAP: Record<number, FollowupStatus> = { 0: 'pending', 1: 'approved', 2: 'rejected', 3: 'in_progress', 4: 'completed' };
  const SOURCE_MAP: Record<number, 'ai_generated' | 'manual'> = { 0: 'ai_generated', 1: 'manual' };
  const PRIORITY_MAP: Record<number, string> = { 0: 'low', 1: 'medium', 2: 'high' };

  // Build a lookup map from callid → CallRecord row
  const callMap = new Map<string, Record<string, unknown>>();
  for (const r of allCallsQuery.data?.items ?? []) {
    const cid = String(r.callid ?? '');
    if (cid) callMap.set(cid, r as Record<string, unknown>);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allItems: GlobalFollowup[] = (allFollowupsQuery.data?.items ?? []).map((r) => {
    const callid = String(r.callid ?? '');
    const call = callMap.get(callid);

    const dueDateStr = r.due_date != null ? String(r.due_date) : null;
    const dueDate = dueDateStr ? new Date(dueDateStr) : null;
    const isOverdue = dueDate != null && dueDate < today;
    const daysOverdue = isOverdue && dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / 86400000) : null;

    // Derive call_sentiment from agent_sentiment decimal if call_sentiment integer is absent
    const rawSentiment = call?.call_sentiment != null ? Number(call.call_sentiment) : null;
    const agentSentiment = call?.agent_sentiment != null ? Number(call.agent_sentiment) : null;
    let callSentiment: number | null = null;
    if (rawSentiment === 1 || rawSentiment === 0 || rawSentiment === -1) {
      callSentiment = rawSentiment;
    } else if (agentSentiment != null) {
      callSentiment = agentSentiment > 0.1 ? 1 : agentSentiment < -0.1 ? -1 : 0;
    }

    const flagVal = (v: unknown) => v != null ? (Number(v) === 0 ? 'Yes' : 'No') : null;

    return {
      id: String(r.Id ?? ''),
      call_id: callid || String(r.Id ?? ''),
      text: String(r.text ?? ''),
      reason: r.reason != null ? String(r.reason) : null,
      source: SOURCE_MAP[Number(r.source)] ?? 'ai_generated',
      status: STATUS_MAP[Number(r.status)] ?? 'pending',
      priority: r.priority != null ? (PRIORITY_MAP[Number(r.priority)] as 'low' | 'medium' | 'high') : null,
      assigned_to: r.assigned_to != null ? String(r.assigned_to) : null,
      due_date: dueDateStr,
      approved_by: r.approved_by != null ? String(r.approved_by) : null,
      approved_at: r.approved_at != null ? String(r.approved_at) : null,
      completed_at: r.completed_at != null ? String(r.completed_at) : null,
      completion_notes: r.completion_notes != null ? String(r.completion_notes) : null,
      created_at: String(r.CreatedOn ?? ''),
      updated_at: String(r.ModifiedOn ?? ''),
      // Joined from CallRecord
      agent_name: call?.agent_name != null ? String(call.agent_name) : null,
      call_date: call?.call_date != null ? String(call.call_date) : null,
      caller_name: call?.caller_name != null ? String(call.caller_name) : null,
      policy_number: call?.policy_number != null ? String(call.policy_number) : null,
      call_intent1: call?.call_intent1 != null ? String(call.call_intent1) : null,
      call_intent2: call?.call_intent2 != null ? String(call.call_intent2) : null,
      call_intent3: call?.call_intent3 != null ? String(call.call_intent3) : null,
      call_summary: call?.call_summary != null ? String(call.call_summary) : null,
      call_sentiment: callSentiment,
      escalation_flag: flagVal(call?.escalation_flag),
      compliance_flag: flagVal(call?.compliance_flag),
      call_resolved_flag: flagVal(call?.call_resolved_flag),
      is_overdue: isOverdue,
      days_overdue: daysOverdue,
    };
  });

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

  const isLoading = allFollowupsQuery.isLoading || allCallsQuery.isLoading;

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
      {/* Page title */}
      <div className="flex items-center gap-2">
        <ListChecks size={20} className="text-emerald-600" />
        <h1 className="text-xl font-bold text-obsidian">Follow-ups Overview</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        <KpiHeroCard
          label="Total"
          value={summary.total.toLocaleString()}
          icon={ListChecks}
          accent="indigo"
          status="neutral"
          footer="all follow-ups"
          delay={0}
          mini
          tooltip="Total follow-up actions created across all calls in the selected period."
        />
        <KpiHeroCard
          label="Needs Review"
          value={summary.pending.toLocaleString()}
          icon={Clock}
          accent="sky"
          status={summary.pending > 0 ? 'watch' : 'good'}
          footer="awaiting approval"
          delay={0.06}
          mini
          tooltip="Follow-ups waiting for a supervisor to review and approve before any action is taken."
        />
        <KpiHeroCard
          label="Approved"
          value={summary.approved.toLocaleString()}
          icon={ThumbsUp}
          accent="emerald"
          status="neutral"
          footer="ready to action"
          delay={0.12}
          mini
          tooltip="Follow-ups that a supervisor has reviewed and approved for action."
        />
        <KpiHeroCard
          label="In Progress"
          value={summary.in_progress.toLocaleString()}
          icon={Activity}
          accent="violet"
          status="neutral"
          footer="being actioned"
          delay={0.18}
          mini
          tooltip="Follow-ups currently being actioned by an agent."
        />
        <KpiHeroCard
          label="Completed"
          value={summary.completed.toLocaleString()}
          icon={CheckCheck}
          accent="cyan"
          status={summary.completed > 0 ? 'good' : 'neutral'}
          footer="fully resolved"
          delay={0.24}
          mini
          tooltip="Follow-ups that have been fully resolved and closed."
        />
        <KpiHeroCard
          label="Overdue"
          value={summary.overdue.toLocaleString()}
          icon={AlertTriangle}
          accent="rose"
          status={summary.overdue > 0 ? 'critical' : 'good'}
          footer="past due date"
          delay={0.30}
          mini
          tooltip="Follow-ups that have passed their due date without being completed. Requires immediate attention."
        />
        <KpiHeroCard
          label="Completion Rate"
          value={`${summary.completion_rate}%`}
          icon={TrendingUp}
          accent="orange"
          status={summary.completion_rate >= 80 ? 'good' : summary.completion_rate >= 50 ? 'watch' : 'critical'}
          footer="completed ÷ total"
          delay={0.36}
          mini
          tooltip="Percentage of all follow-ups that have been completed. Calculated as completed ÷ total × 100."
        />
      </div>

      {/* Filters */}
      <GlassPanel title="Filters" lottieIcon={lottieFilter} accent="#6366F1">
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
      <GlassPanel title={isLoading ? 'Loading…' : `${total} follow-up${total === 1 ? '' : 's'}`} subtitle={`Page ${page} of ${pages}`} lottieIcon={lottieFlow} accent="#8B5CF6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate italic py-6 text-center">No follow-ups match the current filters.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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

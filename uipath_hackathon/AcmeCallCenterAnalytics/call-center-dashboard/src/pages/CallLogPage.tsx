import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import lottieBars from '../assets/lottie/icon-bars.json';
import GlassPanel from '../components/shared/GlassPanel';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import { useDataFabric, ENTITY_IDS } from '../lib/dataFabric';
import type { CallListFilters } from '../api/calls';
import type { CallRecordList } from '../api/calls';
import { exportCsv } from '../utils/csv';

const PAGE_SIZE = 20;
const AGENTS = ['', 'Sam', 'John', 'David', 'Mike', 'Mary'];
const SENTIMENTS = [
  { label: 'All', value: '' },
  { label: 'Positive', value: '1' },
  { label: 'Neutral', value: '0' },
  { label: 'Negative', value: '-1' },
];

const CONTROL_CLASS =
  'bg-paper border border-silver rounded-lg px-3 py-2 text-sm text-graphite focus:outline-none focus:border-emerald-500';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function SentimentBadge({ value }: { value: number | null }) {
  if (value === 1) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Positive</span>;
  }
  if (value === -1) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Negative</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-bone text-slate">Neutral</span>;
}

function FlagBadge({ value, invert = false }: { value: string | null; invert?: boolean }) {
  if (value === null) return <span className="text-mist text-xs">—</span>;
  const isYes = value.toLowerCase() === 'yes';
  const isGood = invert ? !isYes : isYes;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {isYes ? 'Yes' : 'No'}
    </span>
  );
}

export default function CallLogPage() {
  const { entities } = useDataFabric();

  const [agent, setAgent] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [escalation, setEscalation] = useState('');
  const [repeatCall, setRepeatCall] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [intent, setIntent] = useState('');
  const [page, setPage] = useState(1);

  const filters: CallListFilters = {
    agent: agent || undefined,
    sentiment: sentiment !== '' ? Number(sentiment) : undefined,
    escalation: escalation || undefined,
    repeat_call: repeatCall || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    intent: intent || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const callsQuery = useQuery({
    queryKey: ['df-call-records'],
    queryFn: async () => {
      const result = await entities.getAllRecords(ENTITY_IDS.CallRecord);
      return result.items.map((r): CallRecordList => ({
        call_id: Number(r.callid ?? 0),
        call_date: r.call_date != null ? String(r.call_date) : '',
        agent_name: r.agent_name != null ? String(r.agent_name) : null,
        caller_nric: r.caller_nric != null ? String(r.caller_nric) : null,
        call_intent1: r.call_intent1 != null ? String(r.call_intent1) : null,
        call_sentiment: r.call_sentiment != null ? Number(r.call_sentiment) : null,
        escalation_flag: r.escalation_flag != null ? (Number(r.escalation_flag) === 0 ? 'Yes' : 'No') : null,
        compliance_flag: r.compliance_flag != null ? (Number(r.compliance_flag) === 0 ? 'Yes' : 'No') : null,
        call_resolved_flag: r.call_resolved_flag != null ? (Number(r.call_resolved_flag) === 0 ? 'Yes' : 'No') : null,
        repeat_call_flag: r.repeatcall_flag != null ? (Number(r.repeatcall_flag) === 0 ? 'Yes' : 'No') : null,
        duration_seconds: r.duration_seconds != null ? Number(r.duration_seconds) : null,
      }));
    },
  });

  // Apply client-side filters
  const allRecords = callsQuery.data ?? [];
  const filtered = allRecords.filter((c) => {
    if (filters.agent && c.agent_name !== filters.agent) return false;
    if (filters.sentiment !== undefined && c.call_sentiment !== filters.sentiment) return false;
    if (filters.escalation && c.escalation_flag !== filters.escalation) return false;
    if (filters.repeat_call && c.repeat_call_flag !== filters.repeat_call) return false;
    if (filters.start_date && c.call_date < filters.start_date) return false;
    if (filters.end_date && c.call_date > filters.end_date) return false;
    if (filters.intent && !(c.call_intent1 ?? '').toLowerCase().includes(filters.intent.toLowerCase())) return false;
    return true;
  });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isLoading = callsQuery.isLoading;
  const isFetching = callsQuery.isFetching;

  const withReset = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const resetFilters = () => {
    setAgent('');
    setSentiment('');
    setEscalation('');
    setRepeatCall('');
    setStartDate('');
    setEndDate('');
    setIntent('');
    setPage(1);
  };

  const handleExport = () => {
    exportCsv(
      'calls-export',
      items.map((c) => ({
        call_id: c.call_id,
        call_date: c.call_date,
        agent: c.agent_name ?? '',
        nric: c.caller_nric ?? '',
        intent: c.call_intent1 ?? '',
        sentiment: c.call_sentiment === 1 ? 'Positive' : c.call_sentiment === -1 ? 'Negative' : 'Neutral',
        escalated: c.escalation_flag ?? '',
        resolved: c.call_resolved_flag ?? '',
        repeat: c.repeat_call_flag ?? '',
        duration_sec: c.duration_seconds ?? '',
      })),
    );
  };

  const windowStart = Math.max(1, Math.min(pages - 6, page - 3));
  const pageButtons = Array.from({ length: Math.min(7, pages) }, (_, i) => windowStart + i);

  return (
    <div className="space-y-6">
      {/* Filter panel */}
      <GlassPanel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <select className={CONTROL_CLASS} value={agent} onChange={(e) => withReset(setAgent)(e.target.value)}>
            {AGENTS.map((a) => (
              <option key={a} value={a}>
                {a === '' ? 'All Agents' : a}
              </option>
            ))}
          </select>
          <select
            className={CONTROL_CLASS}
            value={sentiment}
            onChange={(e) => withReset(setSentiment)(e.target.value)}
          >
            {SENTIMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            className={CONTROL_CLASS}
            value={escalation}
            onChange={(e) => withReset(setEscalation)(e.target.value)}
          >
            <option value="">All Escalations</option>
            <option value="Yes">Escalated</option>
            <option value="No">Not Escalated</option>
          </select>
          <select
            className={CONTROL_CLASS}
            value={repeatCall}
            onChange={(e) => withReset(setRepeatCall)(e.target.value)}
          >
            <option value="">All Calls</option>
            <option value="Yes">Repeat Only</option>
            <option value="No">First-time Only</option>
          </select>
          <input
            type="date"
            className={CONTROL_CLASS}
            value={startDate}
            onChange={(e) => withReset(setStartDate)(e.target.value)}
          />
          <input
            type="date"
            className={CONTROL_CLASS}
            value={endDate}
            onChange={(e) => withReset(setEndDate)(e.target.value)}
          />
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate" />
            <input
              type="text"
              placeholder="Intent…"
              value={intent}
              onChange={(e) => withReset(setIntent)(e.target.value)}
              className={`${CONTROL_CLASS} pl-7 w-full`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-slate text-xs">
            {isLoading ? '—' : `${total.toLocaleString()} calls found`}
            {isFetching && !isLoading && <span className="text-emerald-600 animate-pulse ml-2">Updating…</span>}
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-slate hover:text-graphite transition-colors"
          >
            Clear filters
          </button>
        </div>
      </GlassPanel>

      {/* Calls table */}
      <GlassPanel
        title="Call Records"
        subtitle="Paginated, filtered call history"
        lottieIcon={lottieBars}
        accent="#3B82F6"
        onExport={items.length > 0 ? handleExport : undefined}
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size={28} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-silver text-slate text-xs uppercase tracking-wide">
                  <th className="py-2 pr-4 text-left">Call ID</th>
                  <th className="py-2 pr-4 text-left">Date</th>
                  <th className="py-2 pr-4 text-left">Agent</th>
                  <th className="py-2 pr-4 text-left">NRIC</th>
                  <th className="py-2 pr-4 text-left">Intent</th>
                  <th className="py-2 pr-4 text-center">Sentiment</th>
                  <th className="py-2 pr-4 text-center">Esc</th>
                  <th className="py-2 pr-4 text-center">Res</th>
                  <th className="py-2 pr-4 text-center">Rep</th>
                  <th className="py-2 text-right">Dur</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <EmptyState title="No calls match the current filters" />
                    </td>
                  </tr>
                ) : (
                  items.map((call) => (
                    <tr
                      key={call.call_id}
                      className="border-b border-silver hover:bg-bone transition-colors group"
                    >
                      <td className="py-2 pr-4">
                        <Link
                          to={`/calls/${call.call_id}`}
                          className="text-blue-600 hover:text-blue-700 font-mono text-xs flex items-center gap-1"
                        >
                          #{call.call_id}
                          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-graphite text-xs">{formatDate(call.call_date)}</td>
                      <td className="py-2 pr-4 text-obsidian font-medium">{call.agent_name ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate font-mono text-xs">{call.caller_nric ?? '—'}</td>
                      <td className="py-2 pr-4 text-graphite max-w-40 truncate text-xs">
                        {call.call_intent1 ?? '—'}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <SentimentBadge value={call.call_sentiment} />
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <FlagBadge value={call.escalation_flag} invert />
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <FlagBadge value={call.call_resolved_flag} />
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <FlagBadge value={call.repeat_call_flag} invert />
                      </td>
                      <td className="py-2 text-right text-slate text-xs">
                        {formatDuration(call.duration_seconds)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-silver">
            <span className="text-slate text-xs">
              Page {page} of {pages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-bone text-slate hover:bg-silver disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {pageButtons.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    p === page ? 'bg-emerald-500 text-white' : 'bg-bone text-slate hover:bg-silver'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="p-1.5 rounded-lg bg-bone text-slate hover:bg-silver disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

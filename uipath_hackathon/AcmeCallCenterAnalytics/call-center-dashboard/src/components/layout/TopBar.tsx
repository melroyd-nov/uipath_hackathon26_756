import { useFilters } from '../../context/FilterContext';

export default function TopBar() {
  const { startDate, endDate, agentFilter, setStartDate, setEndDate, setAgentFilter } =
    useFilters();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={startDate ?? ''}
          onChange={(e) => setStartDate(e.target.value || null)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
        />
        <span className="text-sm text-slate-400">to</span>
        <input
          type="date"
          value={endDate ?? ''}
          onChange={(e) => setEndDate(e.target.value || null)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
        />
        <input
          type="text"
          placeholder="Filter by agent"
          value={agentFilter ?? ''}
          onChange={(e) => setAgentFilter(e.target.value || null)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
        />
      </div>
      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
        AI Usage: placeholder
      </div>
    </header>
  );
}

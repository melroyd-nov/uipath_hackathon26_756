import { useFilters } from '../../context/FilterContext';

const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function FilterBar() {
  const { startDate, endDate, agentFilter, setStartDate, setEndDate, setAgentFilter } = useFilters();

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-silver bg-paper px-4 py-3 shadow-subtle">
      <div className="flex items-center gap-1.5">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.days)}
            className="rounded-pill bg-bone px-3 py-1 text-xs font-medium text-graphite transition-colors hover:bg-lilac-bloom hover:text-obsidian"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={startDate ?? ''}
        onChange={(e) => setStartDate(e.target.value || null)}
        className="rounded-input border border-silver bg-paper px-2 py-1 text-sm text-graphite focus:border-graphite focus:outline-none"
      />
      <span className="text-sm text-slate">to</span>
      <input
        type="date"
        value={endDate ?? ''}
        onChange={(e) => setEndDate(e.target.value || null)}
        className="rounded-input border border-silver bg-paper px-2 py-1 text-sm text-graphite focus:border-graphite focus:outline-none"
      />
      <input
        type="text"
        placeholder="Filter by agent"
        value={agentFilter ?? ''}
        onChange={(e) => setAgentFilter(e.target.value || null)}
        className="rounded-input border border-silver bg-paper px-2 py-1 text-sm text-graphite placeholder:text-slate focus:border-graphite focus:outline-none"
      />
    </div>
  );
}

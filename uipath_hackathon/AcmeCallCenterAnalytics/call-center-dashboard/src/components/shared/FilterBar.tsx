import { useState } from 'react';
import { SlidersHorizontal, CalendarDays } from 'lucide-react';
import { useFilters } from '../../context/FilterContext';

const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function FilterBar() {
  const { startDate, endDate, setStartDate, setEndDate } = useFilters();
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
    setActivePreset(days);
  };

  const inputCls =
    'rounded-lg border border-[rgba(15,31,76,0.12)] bg-white px-3 py-[7px] text-[12px] text-[#374151] focus:border-[#1E5EAC] focus:outline-none focus:shadow-[0_0_0_3px_rgba(30,94,172,0.10)] transition-shadow';

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-[12px] bg-white px-4 py-2.5"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.55)',
        boxShadow: '0 2px 12px rgba(15,31,76,0.07), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}
    >
      {/* Filter icon */}
      <div className="flex items-center gap-1.5 mr-1">
        <SlidersHorizontal size={13} className="text-[#1E5EAC]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-[rgba(15,31,76,0.40)]">Filters</span>
      </div>

      <span className="h-5 w-px bg-[rgba(15,31,76,0.08)]" />

      {/* Quick presets */}
      <div className="inline-flex gap-0.5 rounded-full p-[3px]" style={{ background: 'rgba(15,31,76,0.04)' }}>
        {DATE_PRESETS.map((preset) => {
          const isActive = activePreset === preset.days;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.days)}
              className="rounded-full py-[5px] px-[11px] text-[11.5px] font-semibold transition-all duration-150"
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, #1E5EAC, #3B82F6)',
                      color: 'white',
                      boxShadow: '0 2px 6px rgba(30,94,172,0.30)',
                    }
                  : { color: 'rgba(15,31,76,0.50)' }
              }
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <span className="h-5 w-px bg-[rgba(15,31,76,0.08)]" />

      {/* Date range */}
      <div className="flex items-center gap-2">
        <CalendarDays size={13} className="text-[#9CA3AF]" />
        <input
          type="date"
          value={startDate ?? ''}
          onChange={(e) => { setStartDate(e.target.value || null); setActivePreset(null); }}
          className={inputCls}
        />
        <span className="text-[11px] font-medium text-[#9CA3AF]">→</span>
        <input
          type="date"
          value={endDate ?? ''}
          onChange={(e) => { setEndDate(e.target.value || null); setActivePreset(null); }}
          className={inputCls}
        />
      </div>

    </div>
  );
}

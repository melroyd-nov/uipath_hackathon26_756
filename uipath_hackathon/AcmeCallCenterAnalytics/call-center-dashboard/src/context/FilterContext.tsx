import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

interface FilterState {
  startDate: string | null;
  endDate: string | null;
  agentFilter: string | null;
}

interface FilterContextValue extends FilterState {
  setStartDate: (value: string | null) => void;
  setEndDate: (value: string | null) => void;
  setAgentFilter: (value: string | null) => void;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  const value = useMemo(
    () => ({ startDate, endDate, agentFilter, setStartDate, setEndDate, setAgentFilter }),
    [startDate, endDate, agentFilter],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within a FilterProvider');
  return ctx;
}

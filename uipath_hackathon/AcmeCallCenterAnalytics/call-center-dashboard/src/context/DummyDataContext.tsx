import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

interface DummyDataContextValue {
  useDummyData: boolean;
  toggleDummyData: () => void;
}

const DummyDataContext = createContext<DummyDataContextValue | undefined>(undefined);

export function DummyDataProvider({ children }: { children: ReactNode }) {
  const [useDummyData, setUseDummyData] = useState(false);

  const value = useMemo(
    () => ({ useDummyData, toggleDummyData: () => setUseDummyData((prev) => !prev) }),
    [useDummyData],
  );

  return <DummyDataContext.Provider value={value}>{children}</DummyDataContext.Provider>;
}

export function useDummyDataContext() {
  const ctx = useContext(DummyDataContext);
  if (!ctx) throw new Error('useDummyDataContext must be used within a DummyDataProvider');
  return ctx;
}

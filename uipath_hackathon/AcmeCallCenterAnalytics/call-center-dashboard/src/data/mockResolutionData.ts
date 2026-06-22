import type { ResolutionOverview, RepeatCallByAgent } from '../api/analytics';

export const mockResolutionOverview: ResolutionOverview = {
  resolved_count: 1842,
  unresolved_count: 569,
  resolution_pct: 76.4,
};

export const mockResolutionTrend: { date: string; resolution_pct: number }[] = [
  { date: '2026-01', resolution_pct: 74.2 },
  { date: '2026-02', resolution_pct: 71.8 },
  { date: '2026-03', resolution_pct: 78.5 },
  { date: '2026-04', resolution_pct: 80.1 },
  { date: '2026-05', resolution_pct: 77.3 },
  { date: '2026-06', resolution_pct: 76.4 },
];

export const mockRepeatCallTrend: { date: string; repeat_pct: number }[] = [
  { date: '2026-01', repeat_pct: 22.1 },
  { date: '2026-02', repeat_pct: 19.4 },
  { date: '2026-03', repeat_pct: 18.7 },
  { date: '2026-04', repeat_pct: 16.2 },
  { date: '2026-05', repeat_pct: 15.8 },
  { date: '2026-06', repeat_pct: 17.3 },
];

export const mockRepeatCallByAgent: RepeatCallByAgent[] = [
  { agent_name: 'Priya Nair', total_calls: 312, repeat_count: 37, repeat_pct: 11.9 },
  { agent_name: 'Diego Alvarez', total_calls: 289, repeat_count: 72, repeat_pct: 24.9 },
  { agent_name: 'Mei Lin', total_calls: 301, repeat_count: 42, repeat_pct: 13.9 },
  { agent_name: 'Oluwaseun Bello', total_calls: 264, repeat_count: 55, repeat_pct: 20.8 },
  { agent_name: 'Hannah Cohen', total_calls: 245, repeat_count: 39, repeat_pct: 15.9 },
];

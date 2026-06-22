import type { TriggerWordCount, TriggerWordTrendPoint } from '../api/analytics';

export const mockTriggerWordCounts: TriggerWordCount[] = [
  { word: 'cancel', count: 284, pct_of_calls: 11.3 },
  { word: 'refund', count: 241, pct_of_calls: 9.6 },
  { word: 'complaint', count: 198, pct_of_calls: 7.9 },
  { word: 'lawyer', count: 87, pct_of_calls: 3.5 },
  { word: 'fraud', count: 72, pct_of_calls: 2.9 },
  { word: 'escalate', count: 65, pct_of_calls: 2.6 },
  { word: 'unacceptable', count: 54, pct_of_calls: 2.2 },
  { word: 'supervisor', count: 48, pct_of_calls: 1.9 },
  { word: 'lawsuit', count: 31, pct_of_calls: 1.2 },
  { word: 'terrible', count: 28, pct_of_calls: 1.1 },
];

export const mockTriggerWordTrend: TriggerWordTrendPoint[] = [
  { date: '2026-01', trigger_count: 892 },
  { date: '2026-02', trigger_count: 847 },
  { date: '2026-03', trigger_count: 934 },
  { date: '2026-04', trigger_count: 878 },
  { date: '2026-05', trigger_count: 1021 },
  { date: '2026-06', trigger_count: 1108 },
];

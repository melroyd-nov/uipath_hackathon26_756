import type { AgentSummary, KpiSummary, KpiTrendPoint } from '../api/dashboard';

export const mockKpiSummary: KpiSummary = {
  total_calls: 4820,
  resolution_pct: 83.4,
  avg_sentiment: 0.24,
  escalation_pct: 8.7,
  compliance_fail_pct: 3.2,
  pre_verified_pct: 86.1,
  trigger_words_pct: 2.4,
  repeat_call_pct: 14.6,
  benchmarks: {
    resolution_pct: 80,
    escalation_pct: 10,
    compliance_fail_pct: 5,
    repeat_call_pct: 20,
    pre_verified_pct: 80,
    trigger_words_pct: 3,
  },
};

export const mockKpiTrends: KpiTrendPoint[] = [
  { month: 'Jan', total_calls: 720, resolution_pct: 79, escalation_pct: 11, compliance_fail_pct: 4.5, repeat_call_pct: 18, avg_handle_time_min: 7.8 },
  { month: 'Feb', total_calls: 690, resolution_pct: 80, escalation_pct: 10.5, compliance_fail_pct: 4.1, repeat_call_pct: 17, avg_handle_time_min: 7.5 },
  { month: 'Mar', total_calls: 780, resolution_pct: 81.5, escalation_pct: 9.8, compliance_fail_pct: 3.8, repeat_call_pct: 16.5, avg_handle_time_min: 7.2 },
  { month: 'Apr', total_calls: 810, resolution_pct: 82, escalation_pct: 9.2, compliance_fail_pct: 3.6, repeat_call_pct: 15.8, avg_handle_time_min: 6.9 },
  { month: 'May', total_calls: 860, resolution_pct: 83, escalation_pct: 8.9, compliance_fail_pct: 3.4, repeat_call_pct: 15.1, avg_handle_time_min: 6.6 },
  { month: 'Jun', total_calls: 960, resolution_pct: 83.4, escalation_pct: 8.7, compliance_fail_pct: 3.2, repeat_call_pct: 14.6, avg_handle_time_min: 6.4 },
];

export const mockAgentSummary: AgentSummary[] = [
  { agent: 'Priya Nair', call_count: 312, resolution_pct: 91.2, escalation_pct: 5.1, compliance_fail_pct: 1.8, avg_sentiment: 0.41 },
  { agent: 'Diego Alvarez', call_count: 289, resolution_pct: 88.7, escalation_pct: 6.4, compliance_fail_pct: 2.2, avg_sentiment: 0.33 },
  { agent: 'Mei Lin', call_count: 301, resolution_pct: 87.5, escalation_pct: 7.0, compliance_fail_pct: 2.5, avg_sentiment: 0.29 },
  { agent: 'Oluwaseun Bello', call_count: 264, resolution_pct: 85.1, escalation_pct: 7.8, compliance_fail_pct: 2.9, avg_sentiment: 0.22 },
  { agent: 'Hannah Cohen', call_count: 245, resolution_pct: 82.9, escalation_pct: 8.6, compliance_fail_pct: 3.1, avg_sentiment: 0.18 },
];

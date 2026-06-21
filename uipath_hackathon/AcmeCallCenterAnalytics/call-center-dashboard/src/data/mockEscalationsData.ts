import type { EscalationByAgent, TrendPoint, EscalationRootCause } from '../api/analytics';

export const mockEscalationsByAgent: EscalationByAgent[] = [
  { agent_name: 'Priya Nair', total_calls: 312, escalation_count: 22, escalation_pct: 7.1 },
  { agent_name: 'Diego Alvarez', total_calls: 289, escalation_count: 31, escalation_pct: 10.7 },
  { agent_name: 'Mei Lin', total_calls: 301, escalation_count: 46, escalation_pct: 15.3 },
  { agent_name: 'Oluwaseun Bello', total_calls: 264, escalation_count: 50, escalation_pct: 18.9 },
  { agent_name: 'Hannah Cohen', total_calls: 245, escalation_count: 18, escalation_pct: 7.3 },
];

export const mockEscalationsTrend: TrendPoint[] = [
  { date: '2026-01', escalation_pct: 8.2 },
  { date: '2026-02', escalation_pct: 9.5 },
  { date: '2026-03', escalation_pct: 11.8 },
  { date: '2026-04', escalation_pct: 10.4 },
  { date: '2026-05', escalation_pct: 9.1 },
  { date: '2026-06', escalation_pct: 7.6 },
];

export const mockEscalationsRootCause: EscalationRootCause = {
  by_intent: [
    { intent: 'Cancellation', escalation_count: 49 },
    { intent: 'Refund Request', escalation_count: 71 },
    { intent: 'Technical Support', escalation_count: 69 },
    { intent: 'Billing Inquiry', escalation_count: 87 },
    { intent: 'Order Status', escalation_count: 23 },
    { intent: 'Account Update', escalation_count: 9 },
  ],
};

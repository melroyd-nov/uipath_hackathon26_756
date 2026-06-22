import type { ComplianceByAgent, ComplianceTrendPoint } from '../api/analytics';

export const mockComplianceByAgent: ComplianceByAgent[] = [
  { agent_name: 'Priya Nair', total_calls: 312, fail_count: 6, compliance_fail_pct: 1.9 },
  { agent_name: 'Diego Alvarez', total_calls: 289, fail_count: 19, compliance_fail_pct: 6.6 },
  { agent_name: 'Mei Lin', total_calls: 301, fail_count: 4, compliance_fail_pct: 1.3 },
  { agent_name: 'Oluwaseun Bello', total_calls: 264, fail_count: 24, compliance_fail_pct: 9.1 },
  { agent_name: 'Hannah Cohen', total_calls: 245, fail_count: 11, compliance_fail_pct: 4.5 },
];

export const mockComplianceTrend: ComplianceTrendPoint[] = [
  { date: '2026-01', compliance_fail_pct: 3.1 },
  { date: '2026-02', compliance_fail_pct: 4.8 },
  { date: '2026-03', compliance_fail_pct: 6.2 },
  { date: '2026-04', compliance_fail_pct: 5.7 },
  { date: '2026-05', compliance_fail_pct: 4.4 },
  { date: '2026-06', compliance_fail_pct: 3.9 },
];

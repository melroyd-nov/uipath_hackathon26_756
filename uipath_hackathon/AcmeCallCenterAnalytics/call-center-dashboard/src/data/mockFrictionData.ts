import type { FrictionPoint } from '../api/analytics';

export const mockFrictionPoints: FrictionPoint[] = [
  { intent: 'Billing Dispute',            rank: 1,  total_calls: 312, negative_pct: 72.4, escalation_pct: 38.9, repeat_call_pct: 28.1, friction_score: 49.6 },
  { intent: 'Service Cancellation',       rank: 2,  total_calls: 198, negative_pct: 65.8, escalation_pct: 42.3, repeat_call_pct: 22.7, friction_score: 46.8 },
  { intent: 'Technical Support Failure',  rank: 3,  total_calls: 245, negative_pct: 58.2, escalation_pct: 31.4, repeat_call_pct: 31.6, friction_score: 42.2 },
  { intent: 'Refund Request',             rank: 4,  total_calls: 176, negative_pct: 54.1, escalation_pct: 28.7, repeat_call_pct: 24.3, friction_score: 37.8 },
  { intent: 'Account Access Issue',       rank: 5,  total_calls: 143, negative_pct: 48.3, escalation_pct: 22.1, repeat_call_pct: 29.8, friction_score: 34.5 },
  { intent: 'Pricing Complaint',          rank: 6,  total_calls: 121, negative_pct: 51.7, escalation_pct: 18.4, repeat_call_pct: 19.2, friction_score: 31.9 },
  { intent: 'Delivery / Shipping Issue',  rank: 7,  total_calls: 97,  negative_pct: 44.6, escalation_pct: 15.8, repeat_call_pct: 26.4, friction_score: 30.0 },
  { intent: 'Product Quality Complaint',  rank: 8,  total_calls: 84,  negative_pct: 42.1, escalation_pct: 17.2, repeat_call_pct: 18.9, friction_score: 27.6 },
  { intent: 'Incorrect Charge',           rank: 9,  total_calls: 72,  negative_pct: 38.4, escalation_pct: 12.6, repeat_call_pct: 22.1, friction_score: 25.3 },
  { intent: 'Wait Time Complaint',        rank: 10, total_calls: 61,  negative_pct: 35.2, escalation_pct: 10.3, repeat_call_pct: 17.4, friction_score: 22.0 },
];

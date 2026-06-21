import type { IntentPareto } from '../api/analytics';

const RAW = [
  { intent: 'Billing Inquiry', count: 612, avg_sentiment: -0.08, escalation_pct: 14.2, repeat_call_pct: 22.5 },
  { intent: 'Password Reset', count: 480, avg_sentiment: 0.21, escalation_pct: 3.1, repeat_call_pct: 6.4 },
  { intent: 'Order Status', count: 395, avg_sentiment: 0.05, escalation_pct: 5.8, repeat_call_pct: 11.2 },
  { intent: 'Technical Support', count: 348, avg_sentiment: -0.15, escalation_pct: 19.7, repeat_call_pct: 24.8 },
  { intent: 'Refund Request', count: 271, avg_sentiment: -0.22, escalation_pct: 26.3, repeat_call_pct: 18.1 },
  { intent: 'Account Update', count: 198, avg_sentiment: 0.12, escalation_pct: 4.5, repeat_call_pct: 7.6 },
  { intent: 'Cancellation', count: 154, avg_sentiment: -0.31, escalation_pct: 31.8, repeat_call_pct: 15.9 },
  { intent: 'Product Inquiry', count: 121, avg_sentiment: 0.18, escalation_pct: 2.5, repeat_call_pct: 4.1 },
];

const total = RAW.reduce((sum, r) => sum + r.count, 0);
let cumulative = 0;

export const mockIntentPareto: IntentPareto[] = RAW.map((r) => {
  const pct = (r.count / total) * 100;
  cumulative += pct;
  return {
    intent: r.intent,
    count: r.count,
    pct: Math.round(pct * 10) / 10,
    cumulative_pct: Math.round(cumulative * 10) / 10,
    avg_sentiment: r.avg_sentiment,
    escalation_pct: r.escalation_pct,
    repeat_call_pct: r.repeat_call_pct,
  };
});

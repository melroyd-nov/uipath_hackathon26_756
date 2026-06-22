import type { CallRecordList, CallListFilters, PaginatedCalls } from '../api/calls';

const AGENTS = ['Sam', 'John', 'David', 'Mike', 'Mary'];
const INTENTS = [
  'Billing Dispute',
  'Service Cancellation',
  'Technical Support Failure',
  'Refund Request',
  'Account Access Issue',
  'Pricing Complaint',
  'Delivery / Shipping Issue',
  'Product Quality Complaint',
  'Incorrect Charge',
  'Wait Time Complaint',
  'Policy Renewal',
  'New Product Interest',
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function buildMockCalls(): CallRecordList[] {
  const calls: CallRecordList[] = [];
  const today = new Date(2026, 5, 22);

  for (let i = 0; i < 45; i++) {
    const r1 = seededRandom(i + 1);
    const r2 = seededRandom(i + 2);
    const r3 = seededRandom(i + 3);
    const r4 = seededRandom(i + 4);
    const r5 = seededRandom(i + 5);
    const sentiment = r1 < 0.55 ? 1 : r1 < 0.8 ? 0 : -1;
    const escalated = r2 < 0.15;
    const resolved = r3 < 0.8;
    const repeat = r4 < 0.18;

    const date = new Date(today);
    date.setDate(date.getDate() - i);

    calls.push({
      call_id: 1000 + i,
      call_date: date.toISOString().slice(0, 10),
      agent_name: AGENTS[i % AGENTS.length],
      caller_nric: `S${1000 + Math.floor(r5 * 8999)}${['A', 'B', 'C', 'D'][i % 4]}`,
      call_intent1: INTENTS[i % INTENTS.length],
      call_sentiment: sentiment,
      escalation_flag: escalated ? 'Yes' : 'No',
      compliance_flag: r2 < 0.06 ? 'No' : 'Yes',
      call_resolved_flag: resolved ? 'Yes' : 'No',
      repeat_call_flag: repeat ? 'Yes' : 'No',
      duration_seconds: 120 + Math.floor(r5 * 480),
    });
  }

  return calls;
}

export const mockCalls: CallRecordList[] = buildMockCalls();

export function paginateMockCalls(
  records: CallRecordList[],
  filters: CallListFilters,
  limit: number,
): PaginatedCalls {
  let filtered = records;

  if (filters.agent) {
    filtered = filtered.filter((c) => c.agent_name?.toLowerCase() === filters.agent!.toLowerCase());
  }
  if (filters.sentiment !== undefined) {
    filtered = filtered.filter((c) => c.call_sentiment === filters.sentiment);
  }
  if (filters.escalation) {
    filtered = filtered.filter((c) => c.escalation_flag === filters.escalation);
  }
  if (filters.repeat_call) {
    filtered = filtered.filter((c) => c.repeat_call_flag === filters.repeat_call);
  }
  if (filters.intent) {
    filtered = filtered.filter((c) =>
      c.call_intent1?.toLowerCase().includes(filters.intent!.toLowerCase()),
    );
  }
  if (filters.start_date) {
    filtered = filtered.filter((c) => c.call_date >= filters.start_date!);
  }
  if (filters.end_date) {
    filtered = filtered.filter((c) => c.call_date <= filters.end_date!);
  }

  const total = filtered.length;
  const pages = total === 0 ? 1 : Math.ceil(total / limit);
  const page = filters.page ?? 1;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return { items, total, page, pages };
}

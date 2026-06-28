import type {
  GlobalFollowup,
  GlobalFollowupFilters,
  GlobalFollowupSummary,
  PaginatedFollowups,
  FollowupStatus,
  FollowupSource,
  FollowupPriority,
} from '../api/followups';

const AGENTS = ['Sam', 'John', 'David', 'Mike', 'Mary'];
const CALLERS = ['John Tan', 'Mei Ling', 'Raj Kumar', 'Aisha Bee', 'Wong Kai', 'Farah Aziz', 'Tan Wei'];
const INTENTS = [
  'Billing Dispute',
  'Service Cancellation',
  'Technical Support Failure',
  'Refund Request',
  'Account Access Issue',
  'Policy Renewal',
  'Premium Dispute',
];
const FOLLOWUP_TEXTS = [
  'Call back customer regarding premium dispute',
  'Send written confirmation of refund amount',
  'Escalate to billing supervisor for manual adjustment',
  'Follow up on cancellation request after cooling-off period',
  'Verify updated contact details with customer',
  'Send policy renewal documents via email',
  'Confirm resolution of technical issue with customer',
  'Lodge formal complaint on behalf of customer',
];
const STATUSES: FollowupStatus[] = ['pending', 'approved', 'in_progress', 'completed', 'rejected'];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function buildMockFollowups(): GlobalFollowup[] {
  const today = new Date(2026, 5, 22);
  const items: GlobalFollowup[] = [];

  for (let i = 0; i < 38; i++) {
    const r1 = seededRandom(i + 1);
    const r2 = seededRandom(i + 2);
    const r3 = seededRandom(i + 3);
    const r4 = seededRandom(i + 4);
    const r5 = seededRandom(i + 5);

    const status: FollowupStatus = STATUSES[Math.floor(r1 * STATUSES.length)];
    const source: FollowupSource = r2 < 0.7 ? 'ai_generated' : 'manual';
    const priority: FollowupPriority = r3 < 0.25 ? 'high' : r3 < 0.7 ? 'medium' : 'low';

    const callDate = new Date(today);
    callDate.setDate(callDate.getDate() - Math.floor(r4 * 30));

    const hasDueDate = status !== 'rejected' && r5 < 0.85;
    let dueDate: Date | null = null;
    let isOverdue = false;
    let daysOverdue: number | null = null;
    if (hasDueDate) {
      dueDate = new Date(today);
      const offset = Math.floor((r5 - 0.5) * 20);
      dueDate.setDate(dueDate.getDate() + offset);
      const notFinished = status !== 'completed';
      if (notFinished && dueDate < today) {
        isOverdue = true;
        daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / 86400000);
      }
    }

    const approved = status === 'approved' || status === 'in_progress' || status === 'completed' || status === 'rejected';

    items.push({
      id: String(5000 + i),
      call_id: String(4800 + i),
      text: FOLLOWUP_TEXTS[i % FOLLOWUP_TEXTS.length],
      reason: r1 < 0.6 ? 'customer asked us to call back next week' : null,
      source,
      status,
      priority,
      assigned_to: null,
      due_date: dueDate ? dueDate.toISOString().slice(0, 10) : null,
      approved_by: approved ? AGENTS[(i + 1) % AGENTS.length] : null,
      approved_at: approved ? callDate.toISOString() : null,
      completed_at: status === 'completed' ? callDate.toISOString() : null,
      completion_notes: status === 'completed' ? 'Confirmed with customer, issue resolved.' : null,
      created_at: callDate.toISOString(),
      updated_at: callDate.toISOString(),
      agent_name: AGENTS[i % AGENTS.length],
      call_date: callDate.toISOString().slice(0, 10),
      is_overdue: isOverdue,
      days_overdue: daysOverdue,
      caller_name: CALLERS[i % CALLERS.length],
      policy_number: `POL-${5000 + i}`,
      call_intent1: INTENTS[i % INTENTS.length],
      call_intent2: r2 < 0.4 ? INTENTS[(i + 2) % INTENTS.length] : null,
      call_intent3: null,
      call_summary: 'Customer called regarding an open issue on their account that requires follow-up action.',
      call_sentiment: r3 < 0.45 ? -1 : r3 < 0.75 ? 0 : 1,
      escalation_flag: r4 < 0.2 ? 'Yes' : 'No',
      compliance_flag: 'Yes',
      call_resolved_flag: r5 < 0.6 ? 'Yes' : 'No',
    });
  }

  return items;
}

export const mockFollowups: GlobalFollowup[] = buildMockFollowups();

export function computeMockSummary(): GlobalFollowupSummary {
  const total = mockFollowups.length;
  const pending = mockFollowups.filter((f) => f.status === 'pending').length;
  const approved = mockFollowups.filter((f) => f.status === 'approved').length;
  const inProgress = mockFollowups.filter((f) => f.status === 'in_progress').length;
  const completed = mockFollowups.filter((f) => f.status === 'completed').length;
  const rejected = mockFollowups.filter((f) => f.status === 'rejected').length;
  const overdue = mockFollowups.filter((f) => f.is_overdue).length;
  const dueSoonWindow = new Date(2026, 5, 25);
  const today = new Date(2026, 5, 22);
  const dueSoon = mockFollowups.filter(
    (f) =>
      f.due_date &&
      f.status !== 'completed' &&
      f.status !== 'rejected' &&
      new Date(f.due_date) >= today &&
      new Date(f.due_date) <= dueSoonWindow,
  ).length;
  const denom = approved + inProgress + completed;
  const completionRate = denom === 0 ? 0 : Math.round((completed / denom) * 1000) / 10;

  return {
    total,
    pending,
    approved,
    in_progress: inProgress,
    completed,
    rejected,
    overdue,
    due_soon: dueSoon,
    completion_rate: completionRate,
  };
}

export function paginateMockFollowups(filters: GlobalFollowupFilters, limit: number): PaginatedFollowups {
  let filtered = mockFollowups;

  if (filters.status) {
    filtered = filtered.filter((f) => f.status === filters.status);
  }
  if (filters.overdue) {
    filtered = filtered.filter((f) => f.is_overdue);
  }
  if (filters.source) {
    filtered = filtered.filter((f) => f.source === filters.source);
  }
  if (filters.priority) {
    filtered = filtered.filter((f) => f.priority === filters.priority);
  }
  if (filters.agent) {
    filtered = filtered.filter((f) => f.agent_name?.toLowerCase() === filters.agent!.toLowerCase());
  }
  if (filters.search) {
    filtered = filtered.filter((f) => f.text.toLowerCase().includes(filters.search!.toLowerCase()));
  }

  const sorted = [...filtered].sort((a, b) => {
    if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
    return b.id - a.id;
  });

  const total = sorted.length;
  const pages = total === 0 ? 1 : Math.ceil(total / limit);
  const page = filters.page ?? 1;
  const start = (page - 1) * limit;
  const items = sorted.slice(start, start + limit);

  return { items, total, page, pages };
}

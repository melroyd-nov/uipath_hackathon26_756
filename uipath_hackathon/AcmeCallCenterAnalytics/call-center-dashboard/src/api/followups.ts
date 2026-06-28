import { apiClient } from './client';

export type FollowupStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
export type FollowupSource = 'ai_generated' | 'manual';
export type FollowupPriority = 'low' | 'medium' | 'high';

export interface Followup {
  id: string;
  call_id: string;
  text: string;
  reason: string | null;
  source: FollowupSource;
  status: FollowupStatus;
  priority: FollowupPriority | null;
  assigned_to: string | null;
  due_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowupSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  in_progress: number;
  completed: number;
  completion_rate: number;
}

export interface FollowupsResponse {
  call_id: string;
  summary: FollowupSummary;
  items: Followup[];
}

export interface GlobalFollowup extends Followup {
  agent_name: string | null;
  call_date: string | null;
  is_overdue: boolean;
  days_overdue: number | null;
  caller_name: string | null;
  policy_number: string | null;
  call_intent1: string | null;
  call_intent2: string | null;
  call_intent3: string | null;
  call_summary: string | null;
  call_sentiment: number | null;
  escalation_flag: string | null;
  compliance_flag: string | null;
  call_resolved_flag: string | null;
}

export interface PaginatedFollowups {
  items: GlobalFollowup[];
  total: number;
  page: number;
  pages: number;
}

export interface GlobalFollowupSummary {
  total: number;
  pending: number;
  approved: number;
  in_progress: number;
  completed: number;
  rejected: number;
  overdue: number;
  due_soon: number;
  completion_rate: number;
}

export interface GlobalFollowupFilters {
  status?: string | null;
  source?: string | null;
  priority?: string | null;
  agent?: string | null;
  overdue?: boolean | null;
  start_date?: string | null;
  end_date?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
}

export interface FollowupCreate {
  text: string;
  reason?: string;
  priority?: FollowupPriority;
  assigned_to?: string;
  due_date?: string;
}

export interface FollowupApprove {
  approved_by: string;
  priority?: FollowupPriority;
  assigned_to?: string;
  due_date?: string;
}

export interface FollowupStatusUpdate {
  status: FollowupStatus;
  actor?: string;
  completion_notes?: string;
}

function clean(params: GlobalFollowupFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') out[key] = value;
  }
  return out;
}

export const followupsApi = {
  list: (callId: number): Promise<FollowupsResponse> =>
    apiClient.get<FollowupsResponse>(`/calls/${callId}/followups`).then((r) => r.data),
  listAll: (filters: GlobalFollowupFilters = {}): Promise<PaginatedFollowups> =>
    apiClient.get<PaginatedFollowups>('/followups', { params: clean(filters) }).then((r) => r.data),
  summary: (): Promise<GlobalFollowupSummary> =>
    apiClient.get<GlobalFollowupSummary>('/followups/summary').then((r) => r.data),
  create: (callId: number, body: FollowupCreate): Promise<Followup> =>
    apiClient.post<Followup>(`/calls/${callId}/followups`, body).then((r) => r.data),
  approve: (callId: number, id: number, body: FollowupApprove): Promise<Followup> =>
    apiClient.post<Followup>(`/calls/${callId}/followups/${id}/approve`, body).then((r) => r.data),
  reject: (callId: number, id: number, body: FollowupApprove): Promise<Followup> =>
    apiClient.post<Followup>(`/calls/${callId}/followups/${id}/reject`, body).then((r) => r.data),
  changeStatus: (callId: number, id: number, body: FollowupStatusUpdate): Promise<Followup> =>
    apiClient.post<Followup>(`/calls/${callId}/followups/${id}/status`, body).then((r) => r.data),
  remove: (callId: number, id: number): Promise<void> =>
    apiClient.delete(`/calls/${callId}/followups/${id}`).then(() => undefined),
};

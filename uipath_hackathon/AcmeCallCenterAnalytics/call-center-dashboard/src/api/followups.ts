import { apiClient } from './client';

export type FollowupStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';

export interface FollowupOut {
  id: string;
  call_id: string;
  status: FollowupStatus;
  priority: string;
  agent: string;
  due_date?: string | null;
  [field: string]: unknown;
}

export interface FollowupsResponse {
  call_id: string;
  summary: string;
  items: FollowupOut[];
}

export interface PaginatedFollowups {
  items: FollowupOut[];
  total: number;
  page: number;
  limit: number;
}

export interface GlobalSummary {
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
  status?: FollowupStatus;
  source?: string;
  priority?: string;
  agent?: string;
  overdue?: boolean;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface NewFollowup {
  description: string;
  priority?: string;
  due_date?: string;
  [field: string]: unknown;
}

export async function listCallFollowups(callId: string): Promise<FollowupsResponse> {
  const { data } = await apiClient.get<FollowupsResponse>(`/calls/${callId}/followups`);
  return data;
}

export async function createFollowup(callId: string, followup: NewFollowup): Promise<FollowupOut> {
  const { data } = await apiClient.post<FollowupOut>(`/calls/${callId}/followups`, followup);
  return data;
}

export async function updateFollowup(
  callId: string,
  followupId: string,
  patch: Partial<NewFollowup>,
): Promise<FollowupOut> {
  const { data } = await apiClient.patch<FollowupOut>(
    `/calls/${callId}/followups/${followupId}`,
    patch,
  );
  return data;
}

export async function approveFollowup(callId: string, followupId: string): Promise<FollowupOut> {
  const { data } = await apiClient.post<FollowupOut>(
    `/calls/${callId}/followups/${followupId}/approve`,
  );
  return data;
}

export async function rejectFollowup(callId: string, followupId: string): Promise<FollowupOut> {
  const { data } = await apiClient.post<FollowupOut>(
    `/calls/${callId}/followups/${followupId}/reject`,
  );
  return data;
}

export async function setFollowupStatus(
  callId: string,
  followupId: string,
  status: 'in_progress' | 'completed',
): Promise<FollowupOut> {
  const { data } = await apiClient.post<FollowupOut>(
    `/calls/${callId}/followups/${followupId}/status`,
    { status },
  );
  return data;
}

export async function deleteFollowup(callId: string, followupId: string): Promise<void> {
  await apiClient.delete(`/calls/${callId}/followups/${followupId}`);
}

export async function listAllFollowups(
  filters: GlobalFollowupFilters = {},
): Promise<PaginatedFollowups> {
  const { data } = await apiClient.get<PaginatedFollowups>('/followups', { params: filters });
  return data;
}

export async function getFollowupsSummary(): Promise<GlobalSummary> {
  const { data } = await apiClient.get<GlobalSummary>('/followups/summary');
  return data;
}

import { apiClient } from './client';

export interface CallListFilters {
  agent?: string;
  sentiment?: string;
  escalation?: boolean;
  intent?: string;
  repeat_call?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface CallRecord {
  id: string;
  agent: string;
  intent: string;
  sentiment: string;
  escalation: boolean;
  created_at: string;
  [key: string]: unknown;
}

export interface PaginatedCalls {
  items: CallRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CallRecordDetail extends CallRecord {
  transcript: string;
  [key: string]: unknown;
}

export async function listCalls(filters: CallListFilters = {}): Promise<PaginatedCalls> {
  const { data } = await apiClient.get<PaginatedCalls>('/calls', { params: filters });
  return data;
}

export async function getCall(callId: string): Promise<CallRecordDetail> {
  const { data } = await apiClient.get<CallRecordDetail>(`/calls/${callId}`);
  return data;
}

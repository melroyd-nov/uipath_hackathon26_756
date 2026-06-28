import { apiClient } from './client';

export interface CallRecordList {
  call_id: string;
  call_date: string;
  agent_name: string | null;
  call_intent1: string | null;
  call_sentiment: number | null;
  escalation_flag: string | null;
  compliance_flag: string | null;
  call_resolved_flag: string | null;
  repeat_call_flag: string | null;
  duration_seconds: number | null;
}

export interface CallRecordDetail extends CallRecordList {
  call_start_time: string | null;
  call_end_time: string | null;
  caller_name: string | null;
  caller_dob: string | null;
  caller_number: string | null;
  policy_number: string | null;
  call_intent2: string | null;
  call_intent3: string | null;
  followup_item1: string | null;
  followup_item2: string | null;
  followup_item3: string | null;
  preverified_flag: string | null;
  triggerword_flag: string | null;
  trigger_words: string | null;
  call_summary: string | null;
  file_name: string | null;
  transcript: string | null;
}

export interface PaginatedCalls {
  items: CallRecordList[];
  total: number;
  page: number;
  pages: number;
}

export interface CallListFilters {
  agent?: string;
  sentiment?: number;
  escalation?: string;
  intent?: string;
  repeat_call?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

function clean(filters: CallListFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') out[key] = value;
  }
  return out;
}

export const callsApi = {
  list: (filters: CallListFilters = {}): Promise<PaginatedCalls> =>
    apiClient.get<PaginatedCalls>('/calls', { params: clean(filters) }).then((r) => r.data),
  get: (id: number): Promise<CallRecordDetail> =>
    apiClient.get<CallRecordDetail>(`/calls/${id}`).then((r) => r.data),
};

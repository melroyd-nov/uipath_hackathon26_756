import { apiClient } from './client';

export interface AgentProfile {
  full_name: string;
  role: string;
  team: string;
  experience_years: number;
  manager: string;
  certifications: string[];
  avatar_initials: string;
}

export interface AgentKpi {
  total_calls: number;
  avg_sentiment: number | null;
  escalation_pct: number | null;
  compliance_fail_pct: number | null;
  resolution_pct: number | null;
  preverified_pct: number | null;
  trigger_word_pct: number | null;
  repeat_call_pct: number | null;
  avg_duration_seconds: number | null;
}

export interface FeedbackEntry {
  manager: string;
  date: string;
  rating: number;
  comment: string;
}

export interface AgentDetail {
  profile: AgentProfile;
  kpi: AgentKpi;
  feedback: FeedbackEntry[];
}

export interface AgentFilters {
  start_date?: string;
  end_date?: string;
}

export interface NewFeedbackPayload {
  manager: string;
  rating: number;
  comment: string;
}

export const agentsApi = {
  list: (f?: AgentFilters): Promise<AgentDetail[]> =>
    apiClient.get<AgentDetail[]>('/agents', { params: f }).then((r) => r.data),
  get: (name: string, f?: AgentFilters): Promise<AgentDetail> =>
    apiClient.get<AgentDetail>(`/agents/${name}`, { params: f }).then((r) => r.data),
  addFeedback: (name: string, payload: NewFeedbackPayload): Promise<FeedbackEntry> =>
    apiClient.post<FeedbackEntry>(`/agents/${name}/feedback`, payload).then((r) => r.data),
};

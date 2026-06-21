import { apiClient } from './client';

export interface AgentDetail {
  name: string;
  composite_score?: number;
  [kpi: string]: unknown;
}

export interface FeedbackEntry {
  id: string;
  agent_name: string;
  comment: string;
  created_at: string;
  [field: string]: unknown;
}

export interface NewFeedbackEntry {
  comment: string;
  [field: string]: unknown;
}

export async function listAgents(): Promise<AgentDetail[]> {
  const { data } = await apiClient.get<AgentDetail[]>('/agents');
  return data;
}

export async function getAgent(agentName: string): Promise<AgentDetail> {
  const { data } = await apiClient.get<AgentDetail>(`/agents/${agentName}`);
  return data;
}

export async function listAgentFeedback(agentName: string): Promise<FeedbackEntry[]> {
  const { data } = await apiClient.get<FeedbackEntry[]>(`/agents/${agentName}/feedback`);
  return data;
}

export async function addAgentFeedback(
  agentName: string,
  entry: NewFeedbackEntry,
): Promise<FeedbackEntry> {
  const { data } = await apiClient.post<FeedbackEntry>(`/agents/${agentName}/feedback`, entry);
  return data;
}

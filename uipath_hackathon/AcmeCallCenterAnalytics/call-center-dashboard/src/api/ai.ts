import { apiClient } from './client';

export interface AiAnswer {
  question: string;
  answer: string;
  data_context?: unknown;
}

export interface SuggestedQuestions {
  questions: string[];
}

export interface AiUsageOut {
  calls_today: number;
  total_calls: number;
  period_date: string;
  last_call_at: string | null;
  last_reset_at: string | null;
  last_model: string | null;
  last_endpoint: string | null;
}

export async function askAi(question: string): Promise<AiAnswer> {
  const { data } = await apiClient.post<AiAnswer>('/ai/ask', { question });
  return data;
}

export async function getSuggestedQuestions(): Promise<SuggestedQuestions> {
  const { data } = await apiClient.get<SuggestedQuestions>('/ai/suggested-questions');
  return data;
}

export async function getAiUsage(): Promise<AiUsageOut> {
  const { data } = await apiClient.get<AiUsageOut>('/ai/usage');
  return data;
}

export async function resetAiUsage(): Promise<AiUsageOut> {
  const { data } = await apiClient.post<AiUsageOut>('/ai/usage/reset');
  return data;
}

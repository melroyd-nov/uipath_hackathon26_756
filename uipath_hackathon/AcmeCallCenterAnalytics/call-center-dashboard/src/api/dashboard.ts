import { apiClient } from './client';

export interface KpiSummary {
  [metric: string]: unknown;
}

export interface SentimentTrendPoint {
  date: string;
  [sentiment: string]: unknown;
}

export interface SentimentMonthlyPoint {
  month: string;
  [sentiment: string]: unknown;
}

export interface KpiTrendPoint {
  month: string;
  [kpi: string]: unknown;
}

export interface AgentSummary {
  agent: string;
  call_count: number;
  [metric: string]: unknown;
}

export async function getKpiSummary(): Promise<KpiSummary> {
  const { data } = await apiClient.get<KpiSummary>('/dashboard/summary');
  return data;
}

export async function getSentimentTrend(): Promise<SentimentTrendPoint[]> {
  const { data } = await apiClient.get<SentimentTrendPoint[]>('/dashboard/sentiment-trend');
  return data;
}

export async function getSentimentMonthly(): Promise<SentimentMonthlyPoint[]> {
  const { data } = await apiClient.get<SentimentMonthlyPoint[]>('/dashboard/sentiment-monthly');
  return data;
}

export async function getKpiTrends(): Promise<KpiTrendPoint[]> {
  const { data } = await apiClient.get<KpiTrendPoint[]>('/dashboard/kpi-trends');
  return data;
}

export async function getAgentSummary(): Promise<AgentSummary[]> {
  const { data } = await apiClient.get<AgentSummary[]>('/dashboard/agent-summary');
  return data;
}

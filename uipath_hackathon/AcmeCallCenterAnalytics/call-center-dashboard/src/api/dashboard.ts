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

export interface DashboardFilters {
  start_date?: string | null;
  end_date?: string | null;
  agent?: string | null;
}

function cleanParams(filters: DashboardFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.agent) params.agent = filters.agent;
  return params;
}

export async function getKpiSummary(filters: DashboardFilters = {}): Promise<KpiSummary> {
  const { data } = await apiClient.get<KpiSummary>('/dashboard/summary', { params: cleanParams(filters) });
  return data;
}

export async function getSentimentTrend(): Promise<SentimentTrendPoint[]> {
  const { data } = await apiClient.get<SentimentTrendPoint[]>('/dashboard/sentiment-trend');
  return data;
}

export async function getSentimentMonthly(filters: DashboardFilters = {}): Promise<SentimentMonthlyPoint[]> {
  const { data } = await apiClient.get<SentimentMonthlyPoint[]>('/dashboard/sentiment-monthly', {
    params: cleanParams(filters),
  });
  return data;
}

export async function getKpiTrends(filters: DashboardFilters = {}): Promise<KpiTrendPoint[]> {
  const { data } = await apiClient.get<KpiTrendPoint[]>('/dashboard/kpi-trends', { params: cleanParams(filters) });
  return data;
}

export async function getAgentSummary(filters: DashboardFilters = {}): Promise<AgentSummary[]> {
  const { data } = await apiClient.get<AgentSummary[]>('/dashboard/agent-summary', { params: cleanParams(filters) });
  return data;
}

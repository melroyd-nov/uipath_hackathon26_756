import { apiClient } from './client';

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  agent?: string;
}

export interface IntentPareto {
  intent: string;
  count: number;
  pct: number;
  cumulative_pct: number;
  avg_sentiment: number;
  escalation_pct: number;
  repeat_call_pct: number;
}

export interface EscalationByAgent {
  agent_name: string;
  total_calls: number;
  escalation_count: number;
  escalation_pct: number;
}

export interface TrendPoint {
  date: string;
  escalation_pct: number;
}

export interface EscalationRootCause {
  by_intent: { intent: string; escalation_count: number }[];
}

export interface SentimentByAgent {
  agent: string;
  total_calls: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  negative_pct: number;
  avg_sentiment: number;
}

function get<T>(path: string, filters: AnalyticsFilters = {}): Promise<T> {
  return apiClient.get<T>(`/analytics${path}`, { params: filters }).then((res) => res.data);
}

export const getIntentsPareto = (f?: AnalyticsFilters) => get<IntentPareto[]>('/intents/pareto', f);
export const getIntentsTrend = (f?: AnalyticsFilters) => get('/intents/trend', f);
export const getEscalationsByAgent = (f?: Pick<AnalyticsFilters, 'start_date' | 'end_date'>) =>
  get<EscalationByAgent[]>('/escalations/by-agent', f);
export const getEscalationsTrend = (f?: AnalyticsFilters) => get<TrendPoint[]>('/escalations/trend', f);
export const getEscalationsRootCause = (f?: AnalyticsFilters) => get<EscalationRootCause>('/escalations/root-cause', f);
export const getComplianceByAgent = (f?: AnalyticsFilters) => get('/compliance/by-agent', f);
export const getComplianceTrend = (f?: AnalyticsFilters) => get('/compliance/trend', f);
export const getResolutionOverview = (f?: AnalyticsFilters) => get('/resolution/overview', f);
export const getResolutionTrend = (f?: AnalyticsFilters) => get('/resolution/trend', f);
export const getTriggerWordCounts = (f?: AnalyticsFilters) => get('/trigger-words/counts', f);
export const getTriggerWordTrend = (f?: AnalyticsFilters) => get('/trigger-words/trend', f);
export const getPreverifiedTrend = (f?: AnalyticsFilters) => get('/preverified/trend', f);
export const getRepeatCallsTrend = (f?: AnalyticsFilters) => get('/repeat-calls/trend', f);
export const getRepeatCallsByAgent = (f?: AnalyticsFilters) => get('/repeat-calls/by-agent', f);
export const getFrictionPoints = (f?: AnalyticsFilters) => get('/friction-points', f);
export const getSentimentByAgent = (f?: AnalyticsFilters) => get<SentimentByAgent[]>('/sentiment/by-agent', f);
export const getMarketingOpportunities = (f?: AnalyticsFilters) => get('/marketing-opportunities', f);

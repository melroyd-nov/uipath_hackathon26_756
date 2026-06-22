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
export interface ComplianceByAgent {
  agent_name: string;
  total_calls: number;
  fail_count: number;
  compliance_fail_pct: number;
}

export interface ComplianceTrendPoint {
  date: string;
  compliance_fail_pct: number;
}

export const getComplianceByAgent = (f?: Pick<AnalyticsFilters, 'start_date' | 'end_date'>) =>
  get<ComplianceByAgent[]>('/compliance/by-agent', f);
export const getComplianceTrend = (f?: AnalyticsFilters) => get<ComplianceTrendPoint[]>('/compliance/trend', f);
export interface ResolutionOverview {
  resolved_count: number;
  unresolved_count: number;
  resolution_pct: number;
}

export interface RepeatCallByAgent {
  agent_name: string;
  total_calls: number;
  repeat_count: number;
  repeat_pct: number;
}

export const getResolutionOverview = (f?: AnalyticsFilters) => get<ResolutionOverview>('/resolution/overview', f);
export const getResolutionTrend = (f?: AnalyticsFilters) =>
  get<{ date: string; resolution_pct: number }[]>('/resolution/trend', f);
export interface TriggerWordCount {
  word: string;
  count: number;
  pct_of_calls: number;
}

export interface TriggerWordTrendPoint {
  date: string;
  trigger_count: number;
}

export const getTriggerWordCounts = (f?: AnalyticsFilters) => get<TriggerWordCount[]>('/trigger-words/counts', f);
export const getTriggerWordTrend = (f?: AnalyticsFilters) => get<TriggerWordTrendPoint[]>('/trigger-words/trend', f);
export const getPreverifiedTrend = (f?: AnalyticsFilters) => get('/preverified/trend', f);
export const getRepeatCallsTrend = (f?: AnalyticsFilters) =>
  get<{ date: string; repeat_pct: number }[]>('/repeat-calls/trend', f);
export const getRepeatCallsByAgent = (f?: Pick<AnalyticsFilters, 'start_date' | 'end_date'>) =>
  get<RepeatCallByAgent[]>('/repeat-calls/by-agent', f);
export interface FrictionPoint {
  intent: string;
  rank: number;
  total_calls: number;
  negative_pct: number;
  escalation_pct: number;
  repeat_call_pct: number;
  friction_score: number;
}

export const getFrictionPoints = (f?: AnalyticsFilters) => get<FrictionPoint[]>('/friction-points', f);
export const getSentimentByAgent = (f?: AnalyticsFilters) => get<SentimentByAgent[]>('/sentiment/by-agent', f);

export interface MarketingOpportunity {
  intent: string;
  opportunity_type: string;
  call_count: number;
  positive_sentiment_pct: number;
  avg_sentiment: number;
  conversion_score: number;
}

export const getMarketingOpportunities = (f?: AnalyticsFilters) =>
  get<MarketingOpportunity[]>('/marketing-opportunities', f);

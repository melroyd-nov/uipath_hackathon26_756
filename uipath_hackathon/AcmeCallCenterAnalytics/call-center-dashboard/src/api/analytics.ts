import { apiClient } from './client';

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  agent?: string;
}

function get<T>(path: string, filters: AnalyticsFilters = {}): Promise<T> {
  return apiClient.get<T>(`/analytics${path}`, { params: filters }).then((res) => res.data);
}

export const getIntentsPareto = (f?: AnalyticsFilters) => get('/intents/pareto', f);
export const getIntentsTrend = (f?: AnalyticsFilters) => get('/intents/trend', f);
export const getEscalationsByAgent = (f?: AnalyticsFilters) => get('/escalations/by-agent', f);
export const getEscalationsTrend = (f?: AnalyticsFilters) => get('/escalations/trend', f);
export const getEscalationsRootCause = (f?: AnalyticsFilters) => get('/escalations/root-cause', f);
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
export const getSentimentByAgent = (f?: AnalyticsFilters) => get('/sentiment/by-agent', f);
export const getMarketingOpportunities = (f?: AnalyticsFilters) => get('/marketing-opportunities', f);

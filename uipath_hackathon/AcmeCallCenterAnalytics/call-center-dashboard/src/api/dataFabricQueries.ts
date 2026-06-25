import type { Entities } from '@uipath/uipath-typescript/entities';
import { ENTITY_IDS } from '../lib/dataFabric';
import type { KpiSummary, KpiTrendPoint, AgentSummary } from './dashboard';

export async function getDfKpiSummary(entities: Entities): Promise<KpiSummary> {
  const result = await entities.getAllRecords(ENTITY_IDS.DashboardKpi);
  const row = result.items[0] ?? {};
  return {
    total_calls: row.total_calls ?? 0,
    resolution_pct: row.resolution_pct ?? 0,
    avg_sentiment: row.avg_sentiment ?? 0,
    escalation_pct: row.escalation_pct ?? 0,
    compliance_fail_pct: row.compliance_fail_pct ?? 0,
    pre_verified_pct: row.pre_verified_pct ?? 0,
    trigger_words_pct: row.trigger_words_pct ?? 0,
    repeat_call_pct: row.repeat_call_pct ?? 0,
    avg_handle_time_min: row.avg_handle_time_min ?? 0,
  };
}

export async function getDfKpiTrends(entities: Entities): Promise<KpiTrendPoint[]> {
  const result = await entities.getAllRecords(ENTITY_IDS.MonthlyKpiTrend);
  return result.items.map((row) => ({
    month: row.month_label ?? '',
    total_calls: row.total_calls ?? 0,
    resolution_pct: row.resolution_pct ?? 0,
    escalation_pct: row.escalation_pct ?? 0,
    compliance_fail_pct: row.compliance_fail_pct ?? 0,
    repeat_call_pct: row.repeat_pct ?? 0,
    avg_handle_time_min: row.avg_handle_time_min ?? 0,
    trigger_count: row.trigger_count ?? 0,
  }));
}

export async function getDfAgentSummary(entities: Entities): Promise<AgentSummary[]> {
  const result = await entities.getAllRecords(ENTITY_IDS.AgentSummary);
  return result.items.map((row) => ({
    agent: row.agent_name ?? '',
    call_count: row.total_calls ?? 0,
    resolution_pct: row.resolution_pct ?? 0,
    escalation_pct: row.escalation_pct ?? 0,
    avg_sentiment: row.avg_sentiment ?? 0,
    compliance_fail_pct: row.compliance_fail_pct ?? 0,
    negative_pct: row.negative_pct ?? 0,
    repeat_pct: row.repeat_pct ?? 0,
    qa_score: row.qa_score ?? 0,
    specialisation: row.specialisation ?? '',
  }));
}

export async function getDfSentimentTrend(entities: Entities): Promise<Record<string, unknown>[]> {
  const result = await entities.getAllRecords(ENTITY_IDS.SentimentTrend);
  return result.items.map((row) => ({
    month: row.month_label ?? '',
    avg_score: row.avg_score ?? 0,
    positive_count: row.positive_count ?? 0,
    neutral_count: row.neutral_count ?? 0,
    negative_count: row.negative_count ?? 0,
    total_calls: row.total_calls ?? 0,
  }));
}

export async function getDfIntentSummary(entities: Entities): Promise<Record<string, unknown>[]> {
  const result = await entities.getAllRecords(ENTITY_IDS.IntentSummary);
  return result.items.map((row) => ({
    intent: row.intent_name ?? '',
    count: row.call_count ?? 0,
    pct: row.pct_of_total ?? 0,
    cumulative_pct: row.cumulative_pct ?? 0,
    avg_sentiment: row.avg_sentiment ?? 0,
    escalation_pct: row.escalation_pct ?? 0,
    repeat_call_pct: row.repeat_call_pct ?? 0,
    is_marketing: (row.is_marketing as number) === 0,
    opportunity_type: row.opportunity_type ?? '',
    positive_sentiment_pct: row.positive_sentiment_pct ?? 0,
    conversion_score: row.conversion_score ?? 0,
  }));
}

export async function getDfTriggerWordCount(entities: Entities): Promise<Record<string, unknown>[]> {
  const result = await entities.getAllRecords(ENTITY_IDS.TriggerWordCount);
  return result.items.map((row) => ({
    word: row.word_text ?? '',
    count: row.word_count ?? 0,
    pct_of_calls: row.pct_of_calls ?? 0,
  }));
}

export async function getDfFrictionScore(entities: Entities): Promise<Record<string, unknown>[]> {
  const result = await entities.getAllRecords(ENTITY_IDS.FrictionScore);
  return result.items.map((row) => ({
    intent: row.intent_name ?? '',
    rank: row.rank_order ?? 0,
    total_calls: row.total_calls ?? 0,
    negative_pct: row.negative_pct ?? 0,
    escalation_pct: row.escalation_pct ?? 0,
    repeat_call_pct: row.repeat_call_pct ?? 0,
    friction_score: row.friction_score ?? 0,
  }));
}

export async function getDfComplianceTrend(entities: Entities): Promise<Record<string, unknown>[]> {
  const result = await entities.getAllRecords(ENTITY_IDS.ComplianceRule);
  return result.items.map((row) => ({
    agent: row.agent_name ?? '',
    month: row.month_label ?? '',
    total_calls: row.total_calls ?? 0,
    fail_count: row.fail_count ?? 0,
    compliance_fail_pct: row.compliance_fail_pct ?? 0,
  }));
}

export async function getDfEscalationSummary(entities: Entities): Promise<Record<string, unknown>[]> {
  const result = await entities.getAllRecords(ENTITY_IDS.EscalationSummary);
  return result.items.map((row) => ({
    agent: row.agent_name ?? '',
    month: row.month_label ?? '',
    total_calls: row.total_calls ?? 0,
    escalation_count: row.escalation_count ?? 0,
    escalation_pct: row.escalation_pct ?? 0,
    top_intent: row.top_intent ?? '',
    second_intent: row.second_intent ?? '',
  }));
}

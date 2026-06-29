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
  // Aggregate per-agent KPIs directly from CallRecord (the only real agent data source).
  // Choice set YesNoFlag: 0 = Yes, 1 = No (see Claude.md §4.1).
  // Use getAllRecords so that pagination is handled internally and all records are included.
  // queryRecordsById without a page/limit param only returns the first page, which would
  // silently undercount agents whose calls appear on later pages.
  const result = await entities.getAllRecords(ENTITY_IDS.CallRecord);

  type Acc = {
    call_count: number;
    resolved: number;
    escalated: number;
    compliance_fail: number;
    sentiment_sum: number;
    sentiment_count: number;
    negative: number;
    repeat: number;
  };

  const map: Record<string, Acc> = {};

  for (const row of result.items) {
    const agent = String(row.agent_name ?? '').trim();
    if (!agent) continue;
    if (!map[agent]) {
      map[agent] = {
        call_count: 0, resolved: 0, escalated: 0,
        compliance_fail: 0, sentiment_sum: 0, sentiment_count: 0,
        negative: 0, repeat: 0,
      };
    }
    const m = map[agent];
    m.call_count++;

    // Null guard required: Number(null) === 0 is true in JS, so unset choice-set fields
    // would be misread as NumberId 0 (Yes) without the explicit != null check.
    if (row.call_resolved_flag != null && Number(row.call_resolved_flag) === 0) m.resolved++;
    if (row.escalation_flag != null && Number(row.escalation_flag) === 0) m.escalated++;
    if (row.compliance_flag != null && Number(row.compliance_flag) === 1) m.compliance_fail++;
    if (row.repeatcall_flag != null && Number(row.repeatcall_flag) === 0) m.repeat++;

    // Prefer integer call_sentiment (-1/0/1) if set; fall back to DECIMAL agent_sentiment
    const intS = row.call_sentiment != null ? Number(row.call_sentiment) : null;
    const decS = row.agent_sentiment != null ? Number(row.agent_sentiment) : null;
    const s = intS !== null ? intS : decS;
    if (s !== null) {
      m.sentiment_sum += s;
      m.sentiment_count++;
      if (s < -0.1) m.negative++;
    }
  }

  return Object.entries(map).map(([agent, m]) => ({
    agent,
    call_count: m.call_count,
    resolution_pct: m.call_count > 0 ? (m.resolved / m.call_count) * 100 : 0,
    escalation_pct: m.call_count > 0 ? (m.escalated / m.call_count) * 100 : 0,
    compliance_fail_pct: m.call_count > 0 ? (m.compliance_fail / m.call_count) * 100 : 0,
    avg_sentiment: m.sentiment_count > 0 ? m.sentiment_sum / m.sentiment_count : 0,
    negative_pct: m.call_count > 0 ? (m.negative / m.call_count) * 100 : 0,
    repeat_pct: m.call_count > 0 ? (m.repeat / m.call_count) * 100 : 0,
    qa_score: 0,
    specialisation: '',
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

export async function getDfAgentSentimentCounts(
  entities: Entities,
): Promise<Record<string, { positive: number; neutral: number; negative: number; total: number }>> {
  // call_sentiment (INTEGER) is unreliable — CLI bug silently drops INTEGER values on insert.
  // Use agent_sentiment (DECIMAL, reliably populated from JSON) with standard thresholds.
  const result = await entities.queryRecordsById(ENTITY_IDS.CallRecord, {
    selectedFields: ['agent_name', 'agent_sentiment', 'customer_sentiment', 'call_sentiment'],
  });

  const map: Record<string, { positive: number; neutral: number; negative: number; total: number }> = {};

  for (const row of result.items) {
    const agent = String(row.agent_name ?? '');
    if (!agent) continue;
    if (!map[agent]) map[agent] = { positive: 0, neutral: 0, negative: 0, total: 0 };

    map[agent].total++;

    // Prefer call_sentiment integer if explicitly set, else derive from agent_sentiment decimal
    const intSentiment = row.call_sentiment != null ? Number(row.call_sentiment) : null;
    let category: 'positive' | 'neutral' | 'negative';
    if (intSentiment === 1) {
      category = 'positive';
    } else if (intSentiment === -1) {
      category = 'negative';
    } else if (intSentiment === 0) {
      category = 'neutral';
    } else {
      const score = Number(row.agent_sentiment ?? row.customer_sentiment ?? 0);
      if (score > 0.1) category = 'positive';
      else if (score < -0.1) category = 'negative';
      else category = 'neutral';
    }
    map[agent][category]++;
  }

  return map;
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

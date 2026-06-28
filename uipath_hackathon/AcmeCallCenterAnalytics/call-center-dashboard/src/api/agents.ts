import type { Entities, EntityRecord, EntityQueryFilter } from '@uipath/uipath-typescript/entities';
import { LogicalOperator, QueryFilterOperator, EntityAggregateFunction } from '@uipath/uipath-typescript/entities';
import type { PaginationCursor } from '@uipath/uipath-typescript/core';
import { ENTITY_IDS, AGENT_SPECIALIZATION, YES_NO } from '../lib/dataFabric';

export interface AgentProfile {
  id: string;
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

const EMPTY_KPI: AgentKpi = {
  total_calls: 0,
  avg_sentiment: null,
  escalation_pct: null,
  compliance_fail_pct: null,
  resolution_pct: null,
  preverified_pct: null,
  trigger_word_pct: null,
  repeat_call_pct: null,
  avg_duration_seconds: null,
};

async function fetchAllRecords(entities: Entities, entityId: string): Promise<EntityRecord[]> {
  const all: EntityRecord[] = [];
  let cursor: PaginationCursor | undefined;
  while (true) {
    const page = await entities.getAllRecords(entityId, cursor ? { pageSize: 100, cursor } : { pageSize: 100 });
    all.push(...page.items);
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all;
}

const FLAG_FIELDS = [
  { field: 'escalation_flag', key: 'escalations' as const },
  { field: 'compliance_flag', key: 'complianceFails' as const },
  { field: 'call_resolved_flag', key: 'resolved' as const },
  { field: 'repeatcall_flag', key: 'repeats' as const },
  { field: 'preverified_flag', key: 'preverified' as const },
  { field: 'triggerword_flag', key: 'triggerWords' as const },
];

interface AgentCounts {
  total: number;
  avgSentiment: number | null;
  avgDuration: number | null;
  escalations: number;
  complianceFails: number;
  resolved: number;
  repeats: number;
  preverified: number;
  triggerWords: number;
}

async function fetchKpisByAgentName(entities: Entities, filters?: AgentFilters): Promise<Map<string, AgentKpi>> {
  const dateFilters: EntityQueryFilter[] = [];
  if (filters?.start_date) {
    dateFilters.push({ fieldName: 'call_date', operator: QueryFilterOperator.GreaterThanOrEqual, value: filters.start_date });
  }
  if (filters?.end_date) {
    dateFilters.push({ fieldName: 'call_date', operator: QueryFilterOperator.LessThanOrEqual, value: filters.end_date });
  }

  const totals = await entities.queryRecordsById(ENTITY_IDS.CallRecord, {
    filterGroup: dateFilters.length ? { logicalOperator: LogicalOperator.And, queryFilters: dateFilters } : undefined,
    selectedFields: ['agent_name'],
    groupBy: ['agent_name'],
    aggregates: [
      { function: EntityAggregateFunction.Count, field: 'Id', alias: 'total' },
      { function: EntityAggregateFunction.Avg, field: 'call_sentiment', alias: 'avgSentiment' },
      { function: EntityAggregateFunction.Avg, field: 'duration_seconds', alias: 'avgDuration' },
    ],
  });

  const counts = new Map<string, AgentCounts>();
  for (const row of totals.items) {
    const name = String(row.agent_name ?? '');
    if (!name) continue;
    counts.set(name, {
      total: Number(row.total ?? 0),
      avgSentiment: row.avgSentiment != null ? Number(row.avgSentiment) : null,
      avgDuration: row.avgDuration != null ? Number(row.avgDuration) : null,
      escalations: 0,
      complianceFails: 0,
      resolved: 0,
      repeats: 0,
      preverified: 0,
      triggerWords: 0,
    });
  }

  const flagResults = await Promise.all(
    FLAG_FIELDS.map(({ field }) =>
      entities.queryRecordsById(ENTITY_IDS.CallRecord, {
        filterGroup: {
          logicalOperator: LogicalOperator.And,
          queryFilters: [...dateFilters, { fieldName: field, operator: QueryFilterOperator.Equals, value: String(YES_NO.Yes) }],
        },
        selectedFields: ['agent_name'],
        groupBy: ['agent_name'],
        aggregates: [{ function: EntityAggregateFunction.Count, field: 'Id', alias: 'count' }],
      }),
    ),
  );

  FLAG_FIELDS.forEach(({ key }, i) => {
    for (const row of flagResults[i].items) {
      const name = String(row.agent_name ?? '');
      const entry = counts.get(name);
      if (entry) entry[key] = Number(row.count ?? 0);
    }
  });

  const kpis = new Map<string, AgentKpi>();
  for (const [name, c] of counts) {
    const pct = (n: number) => (c.total > 0 ? (n / c.total) * 100 : null);
    kpis.set(name, {
      total_calls: c.total,
      avg_sentiment: c.avgSentiment,
      escalation_pct: pct(c.escalations),
      compliance_fail_pct: pct(c.complianceFails),
      resolution_pct: pct(c.resolved),
      preverified_pct: pct(c.preverified),
      trigger_word_pct: pct(c.triggerWords),
      repeat_call_pct: pct(c.repeats),
      avg_duration_seconds: c.avgDuration,
    });
  }
  return kpis;
}

function firstNameOf(fullName: string): string {
  return fullName.split(' ')[0] ?? '';
}

function buildProfile(record: EntityRecord): AgentProfile {
  const name = String(record.AgentName ?? '');
  const certifications =
    typeof record.Certifications === 'string' && record.Certifications.trim().length > 0
      ? record.Certifications.split(',').map((c) => c.trim()).filter(Boolean)
      : [];
  const specializationLabel = record.Specialization != null ? AGENT_SPECIALIZATION[Number(record.Specialization)] : undefined;

  return {
    id: String(record.Id),
    full_name: name,
    role: String(record.Role ?? ''),
    team: String(record.Team ?? specializationLabel ?? ''),
    experience_years: Number(record.ExperienceYears ?? 0),
    manager: String(record.Manager ?? ''),
    certifications,
    avatar_initials: String(record.AvatarInitials ?? name.slice(0, 2).toUpperCase()),
  };
}

function buildFeedback(feedbackRecords: EntityRecord[], agentRecordId: string): FeedbackEntry[] {
  return feedbackRecords
    .filter((f) => String(f.Agent) === agentRecordId)
    .map((f) => ({
      manager: String(f.Manager ?? ''),
      date: String(f.FeedbackDate ?? ''),
      rating: Number(f.Rating ?? 0),
      comment: String(f.Comment ?? ''),
    }));
}

// Known agent specialisations from the business domain (CLAUDE.md §8.3)
const AGENT_TEAMS: Record<string, string> = {
  Sam: 'Claims / Grievances',
  John: 'Policy Services',
  David: 'Escalations / Quality',
  Mike: 'New Business / Renewals',
  Mary: 'Billing / Amendments',
};

function buildProfileFromName(name: string): AgentProfile {
  return {
    id: name,
    full_name: name,
    role: 'Agent',
    team: AGENT_TEAMS[name] ?? '',
    experience_years: 0,
    manager: '',
    certifications: [],
    avatar_initials: name.slice(0, 2).toUpperCase(),
  };
}

export const agentsApi = {
  list: async (entities: Entities, filters?: AgentFilters): Promise<AgentDetail[]> => {
    const [agentRecords, feedbackRecords, kpiMap] = await Promise.all([
      fetchAllRecords(entities, ENTITY_IDS.Agents),
      fetchAllRecords(entities, ENTITY_IDS.AgentFeedback),
      fetchKpisByAgentName(entities, filters),
    ]);

    if (agentRecords.length === 0) {
      // Agents entity not yet seeded — build profiles from CallRecord agent names (kpiMap keys)
      return [...kpiMap.entries()].map(([name, kpi]) => ({
        profile: buildProfileFromName(name),
        kpi,
        feedback: [],
      }));
    }

    return agentRecords.map((record) => {
      const profile = buildProfile(record);
      return {
        profile,
        kpi: kpiMap.get(firstNameOf(profile.full_name)) ?? EMPTY_KPI,
        feedback: buildFeedback(feedbackRecords, profile.id),
      };
    });
  },

  get: async (name: string, entities: Entities, filters?: AgentFilters): Promise<AgentDetail | undefined> => {
    const [agentRecords, kpiMap] = await Promise.all([
      fetchAllRecords(entities, ENTITY_IDS.Agents),
      fetchKpisByAgentName(entities, filters),
    ]);

    const record = agentRecords.find(
      (r) => firstNameOf(String(r.AgentName ?? '')).toLowerCase() === name.toLowerCase(),
    );
    if (!record) return undefined;

    const profile = buildProfile(record);
    const feedbackResult = await entities.queryRecordsById(ENTITY_IDS.AgentFeedback, {
      filterGroup: {
        logicalOperator: LogicalOperator.And,
        queryFilters: [{ fieldName: 'Agent', operator: QueryFilterOperator.Equals, value: profile.id }],
      },
    });

    return {
      profile,
      kpi: kpiMap.get(firstNameOf(profile.full_name)) ?? EMPTY_KPI,
      feedback: buildFeedback(feedbackResult.items, profile.id),
    };
  },

  addFeedback: async (agentRecordId: string, payload: NewFeedbackPayload, entities: Entities): Promise<FeedbackEntry> => {
    const today = new Date().toISOString().slice(0, 10);
    const inserted = await entities.insertRecordById(ENTITY_IDS.AgentFeedback, {
      Agent: agentRecordId,
      Manager: payload.manager,
      FeedbackDate: today,
      Rating: payload.rating,
      Comment: payload.comment,
    });
    return {
      manager: String(inserted.Manager ?? payload.manager),
      date: String(inserted.FeedbackDate ?? today),
      rating: Number(inserted.Rating ?? payload.rating),
      comment: String(inserted.Comment ?? payload.comment),
    };
  },
};

import { useMemo } from 'react';
import { Entities, ChoiceSets } from '@uipath/uipath-typescript/entities';
import { useAuth } from '../hooks/useAuth';

export const ENTITY_IDS = {
  Agents: '1f0a1ea1-146e-f111-8fcb-000d3ab36606',
  AgentFeedback: '7d35d49a-156e-f111-8fcb-000d3ab36606',
  CallRecord: 'beac40ee-bd6b-f111-8fcb-000d3ab36606',
  CallFollowup: '993c2c06-be6b-f111-8fcb-000d3ab36606',
  AiUsage: '45af032d-bb6b-f111-8fcb-000d3ab36606',
} as const;

export const CHOICE_SET_IDS = {
  YesNoFlag: '1f70450b-ba6b-f111-8fcb-000d3ab36606',
  AgentSpecialization: '4ca4f169-156e-f111-8fcb-000d3ab36606',
} as const;

// YesNoFlag NumberId mapping (fixed at creation time — see Claude.md §4.1)
export const YES_NO = { Yes: 0, No: 1 } as const;

// AgentSpecialization NumberId mapping (fixed at creation time)
export const AGENT_SPECIALIZATION: Record<number, string> = {
  0: 'Claims / Grievances',
  1: 'Policy Services',
  2: 'Escalations / Quality',
  3: 'New Business / Renewals',
  4: 'Billing / Amendments',
};

export function useDataFabric() {
  const { sdk } = useAuth();
  const entities = useMemo(() => new Entities(sdk), [sdk]);
  const choiceSets = useMemo(() => new ChoiceSets(sdk), [sdk]);
  return { entities, choiceSets };
}

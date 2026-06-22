import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import FilterBar from '../components/shared/FilterBar';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import EmptyState from '../components/shared/EmptyState';
import AgentProfileCard from '../components/cards/AgentProfileCard';
import { useFilters } from '../context/FilterContext';
import { useDummyDataContext } from '../context/DummyDataContext';
import { useDataFabric } from '../lib/dataFabric';
import { agentsApi } from '../api/agents';
import type { AgentDetail } from '../api/agents';
import { mockAgents } from '../data/mockAgentsData';

function agentScore(a: AgentDetail): number {
  const k = a.kpi;
  let score = 50;
  score += Math.max(0, (k.resolution_pct    ?? 70) - 70) * 0.5;
  score -= Math.max(0, (k.escalation_pct    ?? 10) - 10) * 1.5;
  score -= Math.max(0, (k.compliance_fail_pct ?? 5) -  5) * 2;
  score -= Math.max(0, (k.repeat_call_pct   ?? 15) - 15) * 0.8;
  score += (k.avg_sentiment ?? 0.5) * 15;
  return Math.max(0, Math.min(100, score));
}

export default function AgentsPage() {
  const { startDate, endDate } = useFilters();
  const { useDummyData } = useDummyDataContext();
  const { entities } = useDataFabric();

  const agents = useQuery({
    queryKey: ['agents', startDate, endDate],
    queryFn: () =>
      agentsApi.list(entities, { start_date: startDate ?? undefined, end_date: endDate ?? undefined }),
    enabled: !useDummyData,
  });

  const rawData = useDummyData ? mockAgents : (agents.data ?? []);
  const isLoading = !useDummyData && agents.isLoading;

  const ranked = useMemo(
    () =>
      [...rawData]
        .map((agent) => ({ agent, score: agentScore(agent) }))
        .sort((a, b) => b.score - a.score)
        .map((item, i) => ({ ...item, rank: i + 1 })),
    [rawData],
  );

  return (
    <div className="space-y-6">
      <FilterBar />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size={32} />
        </div>
      ) : ranked.length === 0 ? (
        <EmptyState title="No agent profiles found" description="No agents available for this period." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ranked.map(({ agent }, idx) => (
            <AgentProfileCard
              key={agent.profile.full_name}
              agent={agent}
              colorIndex={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
}

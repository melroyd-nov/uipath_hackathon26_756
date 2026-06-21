import { useEffect, useState } from 'react';
import { Brain } from 'lucide-react';
import { getAiUsage } from '../../api/ai';

interface AiUsageBadgeProps {
  collapsed?: boolean;
}

export default function AiUsageBadge({ collapsed }: AiUsageBadgeProps) {
  const [callsToday, setCallsToday] = useState<number | null>(null);

  useEffect(() => {
    getAiUsage()
      .then((usage) => setCallsToday(usage.calls_today))
      .catch(() => setCallsToday(null));
  }, []);

  return (
    <div
      className={`mx-2 mb-2 flex items-center gap-2 rounded-badge bg-white/5 px-3 py-2 text-gray-300 ${collapsed ? 'justify-center' : ''}`}
      title="AI usage today"
    >
      <Brain size={16} className="shrink-0 text-gray-500" />
      {!collapsed && (
        <span className="truncate text-xs font-medium">
          {callsToday === null ? 'AI usage —' : `${callsToday} AI calls today`}
        </span>
      )}
    </div>
  );
}

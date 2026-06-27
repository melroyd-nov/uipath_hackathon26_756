import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const CACHE_PREFIX = 'ai_cache_v1_';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface ChartInsightProps {
  text?: string;
  /** Accepted for backward compatibility; on-demand AI insight is not currently active. */
  prompt?: string;
  cacheKey?: string;
}

function readCache(key: string): string | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { answer, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > CACHE_TTL_MS) return null;
    return answer as string;
  } catch {
    return null;
  }
}

export default function ChartInsight({ text, cacheKey }: ChartInsightProps) {
  const [answer, setAnswer] = useState<string | null>(text ?? (cacheKey ? readCache(cacheKey) : null));

  useEffect(() => {
    if (text !== undefined) setAnswer(text);
  }, [text]);

  if (answer) {
    return (
      <div
        className="mt-3 flex items-start gap-2 rounded-[11px] border border-[rgba(30,94,172,0.14)] px-3 py-[10px] text-[11px] text-[rgba(15,31,76,0.70)] leading-[1.6]"
        style={{ background: 'linear-gradient(135deg,#EAF2FF 0%,#EDE8FF 55%,#E8F4FF 100%)' }}
      >
        <Sparkles size={13} className="mt-0.5 shrink-0 text-[#1E5EAC]" />
        <p>{answer}</p>
      </div>
    );
  }

  return null;
}

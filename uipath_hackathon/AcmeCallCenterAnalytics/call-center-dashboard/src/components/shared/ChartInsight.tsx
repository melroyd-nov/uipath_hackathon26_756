import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { askAi } from '../../api/ai';

const CACHE_PREFIX = 'ai_cache_v1_';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface ChartInsightProps {
  text?: string;
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

function writeCache(key: string, answer: string) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ answer, savedAt: Date.now() }));
  } catch {
    // localStorage unavailable — skip caching
  }
}

export default function ChartInsight({ text, prompt, cacheKey }: ChartInsightProps) {
  const [answer, setAnswer] = useState<string | null>(text ?? (cacheKey ? readCache(cacheKey) : null));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (text !== undefined) setAnswer(text);
  }, [text]);

  if (answer) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-badge bg-bone px-3 py-2 text-sm text-graphite">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-slate" />
        <p>{answer}</p>
      </div>
    );
  }

  if (!prompt) return null;

  const requestInsight = async () => {
    setLoading(true);
    try {
      const res = await askAi(prompt);
      setAnswer(res.answer);
      if (cacheKey) writeCache(cacheKey, res.answer);
    } catch {
      setAnswer('Unable to generate an insight right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={requestInsight}
      disabled={loading}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-badge border border-dashed border-silver bg-bone px-3 py-2 text-sm text-slate transition-colors hover:text-graphite disabled:opacity-60"
    >
      <Sparkles size={14} />
      {loading ? 'Generating insight…' : 'Get AI insight'}
    </button>
  );
}

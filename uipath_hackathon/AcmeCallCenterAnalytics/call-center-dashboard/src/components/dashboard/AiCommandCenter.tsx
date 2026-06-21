import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, Lightbulb, ThumbsUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import GlassPanel from '../shared/GlassPanel';
import AiOrbIcon from '../ai/AiOrbIcon';
import AiBadge from '../ai/AiBadge';
import AiThinkingState from '../ai/AiThinkingState';
import { askAi } from '../../api/ai';
import type { KpiSummary } from '../../api/dashboard';

const CACHE_PREFIX = 'ai_cmd_v3_';
const CACHE_TTL_MS = 30 * 60 * 1000;

const SECTIONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'OVERALL PERFORMANCE', label: 'Overall Performance', icon: TrendingUp },
  { key: 'NEEDS ATTENTION', label: 'Needs Attention', icon: AlertCircle },
  { key: 'RECOMMENDED ACTION', label: 'Recommended Action', icon: Lightbulb },
  { key: 'POSITIVE SIGNAL', label: 'Positive Signal', icon: ThumbsUp },
];

function buildPrompt(kpi: KpiSummary) {
  return (
    `Based on this call center KPI snapshot: ${JSON.stringify(kpi)}, ` +
    `write a short analytics brief. Respond with exactly these four labeled sections, each one or two sentences, no extra text:\n` +
    SECTIONS.map((s) => `${s.key}: <text>`).join('\n')
  );
}

function parseSections(answer: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pattern = new RegExp(`(${SECTIONS.map((s) => s.key).join('|')}):\\s*([\\s\\S]*?)(?=(?:${SECTIONS.map((s) => s.key).join('|')}):|$)`, 'g');
  let match;
  while ((match = pattern.exec(answer)) !== null) {
    result[match[1]] = match[2].trim();
  }
  return result;
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
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // Storage full — evict all ai_cmd_v3_ entries and retry once
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
      try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ answer, savedAt: Date.now() }));
      } catch {
        // Still can't write — skip caching
      }
    }
  }
}

export default function AiCommandCenter({ kpi }: { kpi: KpiSummary | undefined }) {
  const [sections, setSections] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!kpi) {
      setLoading(false);
      return;
    }
    const cacheKey = JSON.stringify(kpi);
    const cached = readCache(cacheKey);
    if (cached) {
      setSections(parseSections(cached));
      return;
    }
    setLoading(true);
    setSections(null);
    let cancelled = false;
    askAi(buildPrompt(kpi))
      .then((res) => {
        if (cancelled) return;
        writeCache(cacheKey, res.answer);
        setSections(parseSections(res.answer));
      })
      .catch(() => { if (!cancelled) setSections({}); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(kpi)]);

  return (
    <GlassPanel>
      <header className="mb-4 flex items-center gap-3">
        <AiOrbIcon size={18} />
        <div>
          <h2 className="font-editorial text-lg text-obsidian">AI Analytics Brief</h2>
          <p className="text-sm text-slate">Generated from this period's KPI data</p>
        </div>
        <AiBadge label="Live" variant="live" />
      </header>
      {loading && <AiThinkingState />}
      {!loading && sections && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="rounded-card border border-silver bg-paper p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icon size={14} className="text-slate" />
                <span className="text-xs font-medium text-graphite">{label}</span>
              </div>
              <p className="text-sm text-obsidian">{sections[key] || 'No insight available.'}</p>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

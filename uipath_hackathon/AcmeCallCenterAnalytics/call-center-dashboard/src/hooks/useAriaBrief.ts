import { useState, useEffect } from 'react';
import { useAriaChat } from './useAriaChat';
import type { KpiSummary } from '../api/dashboard';
import { num } from '../utils/num';

export const BRIEF_SECTION_KEYS = [
  'OVERALL PERFORMANCE',
  'NEEDS ATTENTION',
  'RECOMMENDED ACTION',
  'POSITIVE SIGNAL',
] as const;

export type BriefSectionKey = (typeof BRIEF_SECTION_KEYS)[number];

const MAX_CHARS = 512;
export const ARIA_BRIEF_CACHE_KEY = 'aria_brief_v1';

const TAG = '[ARIA-BRIEF]';

function n(kpi: KpiSummary, key: string): number {
  return num(kpi[key]);
}

function buildPrompt(section: BriefSectionKey, kpi: KpiSummary): string {
  const kpiStr =
    `resolution ${n(kpi, 'resolution_pct').toFixed(1)}%, ` +
    `escalation ${n(kpi, 'escalation_pct').toFixed(1)}%, ` +
    `compliance-fail ${n(kpi, 'compliance_fail_pct').toFixed(1)}%, ` +
    `avg-sentiment ${n(kpi, 'avg_sentiment').toFixed(2)}, ` +
    `repeat-calls ${n(kpi, 'repeat_call_pct').toFixed(1)}%, ` +
    `pre-verified ${n(kpi, 'pre_verified_pct').toFixed(1)}%, ` +
    `trigger-words ${n(kpi, 'trigger_words_pct').toFixed(1)}%`;

  const base =
    `Respond in plain text only. No markdown, no bullet points, no tables, ` +
    `no headers, no lists. Maximum ${MAX_CHARS} characters. ` +
    `Call center KPIs: ${kpiStr}.`;

  const questions: Record<BriefSectionKey, string> = {
    'OVERALL PERFORMANCE': `${base} Summarize the overall call center performance in one or two sentences.`,
    'NEEDS ATTENTION': `${base} Identify the single metric that needs the most attention right now and briefly explain why.`,
    'RECOMMENDED ACTION': `${base} Give one specific action a call center manager should take today based on the data.`,
    'POSITIVE SIGNAL': `${base} Identify the strongest positive signal or win in this data and why it matters.`,
  };

  return questions[section];
}

function readCache(): Partial<Record<BriefSectionKey, string>> {
  try {
    const raw = sessionStorage.getItem(ARIA_BRIEF_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<BriefSectionKey, string>>;
      console.log(TAG, 'Cache hit — loaded from sessionStorage', parsed);
      return parsed;
    }
  } catch {
    // ignore
  }
  console.log(TAG, 'Cache miss — starting fresh');
  return {};
}

function writeCache(data: Record<BriefSectionKey, string>) {
  try {
    sessionStorage.setItem(ARIA_BRIEF_CACHE_KEY, JSON.stringify(data));
    console.log(TAG, 'Wrote all 4 sections to sessionStorage cache');
  } catch {
    // sessionStorage unavailable
  }
}

export function useAriaBrief({ kpi }: { kpi: KpiSummary | undefined }) {
  const [sections, setSections] = useState<Partial<Record<BriefSectionKey, string>>>(readCache);

  const isCached = BRIEF_SECTION_KEYS.every((k) => Boolean(sections[k]));

  const { messages, isStreaming, isReady, error, sendMessage } = useAriaChat({
    restoreHistory: false,
  });

  // ── SEND EFFECT ───────────────────────────────────────────────────────────
  // Derives entirely from messages state — no fragile ref flags that can
  // desync when sendMessage is silently blocked (e.g. session not yet open).
  useEffect(() => {
    // Count how many user prompts we've actually sent (messages received by the hook)
    const userSent = messages.filter((m) => m.role === 'user').length;
    const assistantDone = messages.filter((m) => m.role === 'assistant' && !m.isStreaming).length;

    console.log(TAG, 'SEND EFFECT fired', {
      kpiDefined: Boolean(kpi),
      isReady,
      isCached,
      isStreaming,
      userSent,
      assistantDone,
      totalMessages: messages.length,
    });

    if (!kpi) { console.log(TAG, '  → SKIP: kpi not loaded yet'); return; }
    if (!isReady) { console.log(TAG, '  → SKIP: useAriaChat not ready yet'); return; }
    if (isCached) { console.log(TAG, '  → SKIP: all sections already cached'); return; }
    if (isStreaming) { console.log(TAG, '  → SKIP: waiting for current response'); return; }

    // Still waiting for a response to a prompt we sent (shouldn't normally happen
    // after streaming ends, but guard against it to avoid double-sending)
    if (userSent > assistantDone) {
      console.log(TAG, '  → SKIP: sent', userSent, 'prompts but only', assistantDone, 'responses done');
      return;
    }

    if (userSent >= BRIEF_SECTION_KEYS.length) {
      console.log(TAG, '  → SKIP: all', BRIEF_SECTION_KEYS.length, 'prompts already sent');
      return;
    }

    const key = BRIEF_SECTION_KEYS[userSent];
    const prompt = buildPrompt(key, kpi);
    console.log(TAG, `  → SENDING prompt #${userSent} for section "${key}" (${prompt.length} chars)`);
    sendMessage(prompt);
  }, [kpi, isReady, isCached, isStreaming, messages, sendMessage]);

  // ── EXTRACT EFFECT ────────────────────────────────────────────────────────
  // Maps completed assistant messages back to section keys and updates state.
  useEffect(() => {
    if (isCached) return;

    const completed = messages.filter((m) => m.role === 'assistant' && !m.isStreaming && m.content);

    console.log(TAG, 'EXTRACT EFFECT fired', {
      completedCount: completed.length,
      isStreaming,
      sectionsPopulated: Object.keys(sections).length,
    });

    if (completed.length === 0) return;

    const incoming: Partial<Record<BriefSectionKey, string>> = {};
    completed.forEach((msg, i) => {
      if (i < BRIEF_SECTION_KEYS.length) {
        const key = BRIEF_SECTION_KEYS[i];
        const text = msg.content.slice(0, MAX_CHARS);
        incoming[key] = text;
        console.log(TAG, `  section "${key}" → ${text.length} chars: "${text.slice(0, 80)}…"`);
      }
    });

    if (Object.keys(incoming).length === 0) return;

    setSections((prev) => {
      const next = { ...prev, ...incoming };
      const allDone = BRIEF_SECTION_KEYS.every((k) => Boolean(next[k]));
      if (allDone) {
        writeCache(next as Record<BriefSectionKey, string>);
      }
      return next;
    });
  }, [isCached, messages, isStreaming, sections]);

  const isLoading = !isCached && (
    !isReady ||
    messages.filter((m) => m.role === 'assistant' && !m.isStreaming).length < BRIEF_SECTION_KEYS.length
  );

  console.log(TAG, 'render', { isReady, isLoading, isCached, error, sectionKeys: Object.keys(sections) });

  return { sections, isLoading, error };
}

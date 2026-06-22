import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bot, Send, Trash2, AlertCircle } from 'lucide-react';
import SuggestedQuestions from '../components/ai/SuggestedQuestions';
import AiChatMessage from '../components/ai/AiChatMessage';
import type { ChatMessage } from '../components/ai/AiChatMessage';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { askAi, getSuggestedQuestions } from '../api/ai';
import { getKpiSummary } from '../api/dashboard';

const LS_PREFIX = 'ai_chat_v1_';
const TTL_MS = 60 * 60 * 1000;

function hashKey(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return Math.abs(h).toString(36);
}

function lsGet(key: string): string | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const { answer, exp } = JSON.parse(raw) as { answer: string; exp: number };
    if (Date.now() > exp) {
      localStorage.removeItem(LS_PREFIX + key);
      return null;
    }
    return answer;
  } catch {
    return null;
  }
}

function lsSet(key: string, answer: string): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ answer, exp: Date.now() + TTL_MS }));
  } catch {
    // localStorage unavailable — silently no-op
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
        <Bot size={15} className="text-purple-600" />
      </div>
      <div className="bg-bone px-4 py-3 rounded-2xl flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AIInsightsPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const kpiSummary = useQuery({
    queryKey: ['kpi-summary'],
    queryFn: () => getKpiSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const suggested = useQuery({
    queryKey: ['suggested-questions'],
    queryFn: () => getSuggestedQuestions(),
    staleTime: Infinity,
  });

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const key = hashKey(question.trim().toLowerCase());
      const cached = lsGet(key);
      if (cached) return { answer: cached };
      const res = await askAi(question);
      lsSet(key, res.answer);
      return { answer: res.answer };
    },
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer }]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, askMutation.isPending]);

  const handleSend = (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || askMutation.isPending) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    askMutation.mutate(text);
  };

  const totalCalls = kpiSummary.data?.total_calls as number | undefined;
  const showSuggestions = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <span className="text-slate text-sm">Ask anything about call patterns, agent performance, and trends.</span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-xs text-slate hover:text-graphite transition-colors"
          >
            <Trash2 size={13} />
            Clear chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {showSuggestions && (
          <>
            <div className="bg-paper border border-silver rounded-2xl p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
                <Bot size={22} className="text-purple-600" />
              </div>
              <div>
                <p className="text-obsidian font-semibold mb-1">Novigo Analytics AI</p>
                <p className="text-slate text-sm leading-relaxed">
                  I have live access to all{' '}
                  <span className="text-obsidian font-medium">{totalCalls ?? '...'}</span> call records. Ask me
                  about trends, agent performance, friction points, or anything else in your call center data.
                </p>
              </div>
            </div>

            {suggested.isLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size={20} />
              </div>
            ) : (
              <SuggestedQuestions questions={suggested.data?.questions ?? []} onSelect={(q) => handleSend(q)} />
            )}
          </>
        )}

        {messages.map((m, i) => (
          <AiChatMessage key={i} message={m} />
        ))}

        {askMutation.isPending && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 pt-4 border-t border-silver">
        {askMutation.isError && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 mb-2">
            <AlertCircle size={13} />
            Failed to get response — check that the backend is running and credentials are valid.
          </div>
        )}

        <div className="bg-paper border border-silver rounded-2xl flex items-end gap-3 p-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question about your call center data… (Enter to send, Shift+Enter for new line)"
            disabled={askMutation.isPending}
            rows={1}
            style={{ minHeight: 24 }}
            className="flex-1 bg-transparent text-obsidian text-sm placeholder-slate resize-none focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || askMutation.isPending}
            className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors"
          >
            {askMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-mist text-xs mt-2 text-center">
          Powered by Claude · Live data from PostgreSQL · Responses are AI-generated
        </p>
      </div>
    </div>
  );
}

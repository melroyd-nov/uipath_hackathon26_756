import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Send, Trash2, AlertCircle } from 'lucide-react';
import SuggestedQuestions from '../components/ai/SuggestedQuestions';
import AiChatMessage from '../components/ai/AiChatMessage';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { getKpiSummary } from '../api/dashboard';
import { useAriaChat } from '../hooks/useAriaChat';

const SUGGESTED_QUESTIONS = [
  'Which agents have the highest escalation rate?',
  'What are the most common call intents this week?',
  'Show me calls with compliance violations.',
  'What is the average call resolution rate?',
  'Which calls have pending follow-ups?',
];

export default function AIInsightsPage() {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isStreaming, isReady, error, sendMessage, clearChat } = useAriaChat({
    restoreHistory: true,
  });

  const kpiSummary = useQuery({
    queryKey: ['kpi-summary'],
    queryFn: () => getKpiSummary(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || isStreaming) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    sendMessage(text);
  };

  const totalCalls = kpiSummary.data?.total_calls as number | undefined;
  const showSuggestions = messages.length === 0;

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <LoadingSpinner size={28} />
        <p className="text-slate text-sm">Connecting to Aria…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <span className="text-slate text-sm">Ask anything about call patterns, agent performance, and trends.</span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="flex items-center gap-1.5 text-xs text-slate hover:text-graphite transition-colors"
          >
            <Trash2 size={13} />
            Clear chat
          </button>
        )}
      </div>

      <div className="chat-scroll flex-1 overflow-y-auto space-y-4 pr-1">
        {showSuggestions && (
          <>
            <div className="bg-paper border border-silver rounded-2xl p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
                <Bot size={22} className="text-purple-600" />
              </div>
              <div>
                <p className="text-obsidian font-semibold mb-1">Aria — Call Analytics Agent</p>
                <p className="text-slate text-sm leading-relaxed">
                  I have live access to all{' '}
                  <span className="text-obsidian font-medium">{totalCalls ?? '...'}</span> call records. Ask me
                  about trends, agent performance, friction points, or anything else in your call center data.
                </p>
              </div>
            </div>

            <SuggestedQuestions questions={SUGGESTED_QUESTIONS} onSelect={(q) => handleSend(q)} />
          </>
        )}

        {messages.map((m) => (
          <AiChatMessage key={m.id} message={m} />
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 pt-4 border-t border-silver">
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 mb-2">
            <AlertCircle size={13} />
            {error}
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
            disabled={isStreaming || !isReady}
            rows={1}
            style={{ minHeight: 24 }}
            className="flex-1 bg-transparent text-obsidian text-sm placeholder-slate resize-none focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming || !isReady}
            className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors"
          >
            {isStreaming ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-mist text-xs mt-2 text-center">
          Powered by Aria · UiPath Conversational Agent · Live Data Fabric data
        </p>
      </div>
    </div>
  );
}

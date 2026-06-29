import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSidebar } from '../context/SidebarContext';
import { Sparkles, Send, Trash2, AlertCircle, ArrowUp, Zap } from 'lucide-react';
import AiChatMessage from '../components/ai/AiChatMessage';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { getKpiSummary } from '../api/dashboard';
import { useAriaChat } from '../hooks/useAriaChat';

const SUGGESTED_QUESTIONS = [
  { label: 'Top escalation drivers', q: 'Which agents have the highest escalation rate?' },
  { label: 'Common call intents', q: 'What are the most common call intents this week?' },
  { label: 'Compliance violations', q: 'Show me calls with compliance violations.' },
  { label: 'Resolution rate', q: 'What is the average call resolution rate?' },
  { label: 'Pending follow-ups', q: 'Which calls have pending follow-ups?' },
  { label: 'Sentiment trends', q: 'How has customer sentiment trended over the past week?' },
];

export default function AIInsightsPage() {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { collapsed } = useSidebar();
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
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-300/30 flex items-center justify-center">
            <Sparkles size={28} className="text-purple-500" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-500 border-2 border-paper animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-obsidian font-medium text-sm">Connecting to Aria</p>
          <p className="text-slate text-xs mt-0.5">Initialising your analytics agent…</p>
        </div>
        <LoadingSpinner size={20} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full mx-auto w-full transition-all duration-200 ${collapsed ? 'max-w-7xl' : 'max-w-6xl'}`}>

      {/* Header bar — only shown once chat has started */}
      <div className={`flex items-center justify-between mb-5 flex-shrink-0 ${showSuggestions ? 'hidden' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-ai-card">
              <Sparkles size={17} className="text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-paper" />
          </div>
          <div>
            <p className="text-obsidian font-semibold text-sm leading-none">Aria</p>
            <p className="text-slate text-xs mt-0.5">Call Analytics Agent · Live data</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="flex items-center gap-1.5 text-xs text-slate hover:text-graphite border border-silver hover:border-mist bg-paper rounded-lg px-3 py-1.5 transition-colors"
          >
            <Trash2 size={12} />
            Clear chat
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="chat-scroll flex-1 overflow-y-auto space-y-6 pr-1 pb-2">

        {/* Empty state hero */}
        {showSuggestions && (
          <div className="space-y-5">
            {/* Hero card */}
            <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50 via-paper to-indigo-50/40 p-6">
              {/* Decorative blobs */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-purple-300/20 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-indigo-300/15 blur-2xl pointer-events-none" />

              <div className="relative flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-ai-card shrink-0">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-obsidian font-semibold">Aria — Call Analytics Agent</p>
                    <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-medium">Live</span>
                  </div>
                  <p className="text-slate text-sm leading-relaxed">
                    I have live access to{' '}
                    <span className="text-obsidian font-semibold">{totalCalls?.toLocaleString() ?? '…'}</span>{' '}
                    call records. Ask me about trends, agent performance, compliance issues, or anything else in your call centre data.
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate">
                      <Zap size={11} className="text-amber-500" />
                      Powered by UiPath Conversational Agent
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested questions */}
            <div>
              <p className="text-xs text-mist font-medium uppercase tracking-wider mb-3">Suggested questions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SUGGESTED_QUESTIONS.map(({ label, q }) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="group text-left rounded-xl border border-silver bg-paper hover:border-purple-300 hover:bg-purple-50/50 hover:shadow-ai-card transition-all duration-150 p-4"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 group-hover:bg-purple-500 transition-colors shrink-0" />
                      <span className="text-xs font-semibold text-purple-700 group-hover:text-purple-800">{label}</span>
                    </div>
                    <p className="text-xs text-graphite leading-relaxed line-clamp-2">{q}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((m) => (
          <AiChatMessage key={m.id} message={m} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 pt-4">
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 mb-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        <div className="relative bg-paper border border-silver rounded-2xl shadow-subtle focus-within:border-purple-300 focus-within:shadow-ai-card transition-all duration-200">
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
            placeholder="Ask anything about your call centre data…"
            disabled={isStreaming || !isReady}
            rows={1}
            style={{ minHeight: 24 }}
            className="w-full bg-transparent text-obsidian text-sm placeholder-mist resize-none focus:outline-none disabled:opacity-50 px-4 pt-4 pb-12"
          />

          {/* Footer row inside input box */}
          <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between pointer-events-none">
            <span className="text-mist text-xs pointer-events-none">
              {isStreaming ? 'Aria is thinking…' : 'Enter to send · Shift+Enter for new line'}
            </span>
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming || !isReady}
              className="pointer-events-auto w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {isStreaming ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp size={14} className="text-white" />
              )}
            </button>
          </div>
        </div>

        <p className="text-mist text-xs mt-2 text-center">
          Aria may occasionally make mistakes · Always verify critical decisions
        </p>
      </div>
    </div>
  );
}

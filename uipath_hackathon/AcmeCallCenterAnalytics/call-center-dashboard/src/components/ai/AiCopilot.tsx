import { useState } from 'react';
import type { ReactNode } from 'react';
import { X, Send } from 'lucide-react';
import AiOrbIcon from './AiOrbIcon';
import { useAriaChat } from '../../hooks/useAriaChat';

function inlineFormat(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={key++} className="font-bold text-obsidian">{match[1]}</strong>);
    } else {
      nodes.push(<code key={key++} className="bg-silver/40 text-blue-700 px-1 rounded text-xs font-mono">{match[2]}</code>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const SUGGESTED_QUESTIONS = [
  'What are the top escalation drivers today?',
  'Which agent has the best resolution rate?',
  'Show me any compliance issues from recent calls.',
];

export default function AiCopilot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');

  const { messages, isStreaming, isReady, sendMessage } = useAriaChat({ restoreHistory: false });

  const ask = (text: string) => {
    if (!text.trim() || isStreaming) return;
    setQuestion('');
    sendMessage(text);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[480px] w-80 flex-col overflow-hidden rounded-card-elevated border border-silver bg-paper shadow-card">
          <header className="flex items-center justify-between border-b border-silver px-4 py-3">
            <span className="font-editorial text-base text-obsidian">Aria Copilot</span>
            <button type="button" onClick={() => setOpen(false)} className="text-slate hover:text-obsidian">
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.length === 0 && isReady && (
              <div className="space-y-2">
                <p className="text-sm text-slate">Ask anything about your call center data.</p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => ask(q)}
                    className="block w-full rounded-input border border-silver px-3 py-2 text-left text-sm text-graphite hover:bg-bone"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.length === 0 && !isReady && (
              <p className="text-sm text-slate">Connecting to Aria…</p>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'ml-auto bg-sky-veil text-obsidian'
                    : 'border border-silver bg-bone text-obsidian'
                }`}
              >
                {m.isStreaming && !m.content ? (
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  inlineFormat(m.content)
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
            className="flex items-center gap-2 border-t border-silver p-3"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question…"
              disabled={isStreaming || !isReady}
              className="flex-1 rounded-input border border-silver px-3 py-1.5 text-sm focus:border-graphite focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!question.trim() || isStreaming || !isReady}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-obsidian text-paper hover:bg-graphite disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="shadow-card transition-transform hover:scale-105"
        aria-label="Toggle AI Copilot"
      >
        <AiOrbIcon size={20} />
      </button>
    </div>
  );
}

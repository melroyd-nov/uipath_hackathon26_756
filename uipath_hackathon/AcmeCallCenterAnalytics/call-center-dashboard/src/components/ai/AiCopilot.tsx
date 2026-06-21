import { useEffect, useState } from 'react';
import { X, Send } from 'lucide-react';
import AiOrbIcon from './AiOrbIcon';
import { askAi, getSuggestedQuestions } from '../../api/ai';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiCopilot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (open && suggested.length === 0) {
      getSuggestedQuestions()
        .then((res) => setSuggested(res.questions))
        .catch(() => setSuggested([]));
    }
  }, [open, suggested.length]);

  const ask = async (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setQuestion('');
    setThinking(true);
    try {
      const res = await askAi(text);
      setMessages((prev) => [...prev, { role: 'assistant', text: res.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Something went wrong answering that.' }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[480px] w-80 flex-col overflow-hidden rounded-card-elevated border border-silver bg-paper shadow-card">
          <header className="flex items-center justify-between border-b border-silver px-4 py-3">
            <span className="font-editorial text-base text-obsidian">AI Copilot</span>
            <button type="button" onClick={() => setOpen(false)} className="text-slate hover:text-obsidian">
              <X size={18} />
            </button>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate">Ask anything about your call center data.</p>
                {suggested.map((q) => (
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
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'ml-auto bg-sky-veil text-obsidian'
                    : 'border border-silver bg-bone text-obsidian'
                }`}
              >
                {m.text}
              </div>
            ))}
            {thinking && <p className="text-xs text-slate">Thinking…</p>}
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
              className="flex-1 rounded-input border border-silver px-3 py-1.5 text-sm focus:border-graphite focus:outline-none"
            />
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-obsidian text-paper hover:bg-graphite"
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

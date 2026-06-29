import type { ReactNode } from 'react';
import { Sparkles, User } from 'lucide-react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

function inlineFormat(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Match **bold** or `code` — bold allows any chars except newline between **
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-bold text-obsidian">
          {match[1]}
        </strong>,
      );
    } else {
      nodes.push(
        <code key={key++} className="bg-silver/40 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono">
          {match[2]}
        </code>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function isMetricLine(text: string): { label: string; value: string; isPercent: boolean } | null {
  const m = text.match(/^(.+?):\s*([\d.]+%|\d+\s*calls)\s*$/i);
  if (!m) return null;
  return { label: m[1], value: m[2], isPercent: m[2].includes('%') };
}

function bulletDotColor(text: string): string {
  const lead = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
  if (['action', 'recommend', 'coach', 'train'].some((w) => lead.startsWith(w))) return 'bg-emerald-500';
  if (['concern', 'warn', 'risk', 'exceed', 'fail'].some((w) => lead.startsWith(w))) return 'bg-amber-500';
  return 'bg-purple-500';
}

function renderTable(lines: string[], key: number): ReactNode {
  const rows = lines
    .filter((l) => !/^\s*\|?\s*[-:]+\s*\|/.test(l))
    .map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  const stripped = (cell: string) => cell.replace(/\*\*/g, '').replace(/`/g, '');
  const isNumeric = (plain: string) => /^\d+(\.\d+)?%$/.test(plain) || /^\d+(\.\d+)?$/.test(plain);
  // Determine per-column alignment by majority of body cells
  const colCount = header.length;
  const numericCol = Array.from({ length: colCount }, (_, ci) =>
    body.filter((row) => isNumeric(stripped(row[ci] ?? ''))).length > body.length / 2,
  );
  return (
    <table key={key} className="w-full text-xs my-2 border-collapse">
      <thead>
        <tr className="bg-bone uppercase text-slate">
          {header.map((h, i) => (
            <th key={i} className={`px-2 py-1 border-b border-silver ${numericCol[i] ? 'text-right' : 'text-left'}`}>
              {inlineFormat(h)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row, ri) => (
          <tr key={ri} className="border-b border-silver">
            {row.map((cell, ci) => {
              const plain = stripped(cell);
              const isPct = /^\d+(\.\d+)?%$/.test(plain);
              const isBigNum = /^\d+(\.\d+)?$/.test(plain) && !isPct;
              return (
                <td
                  key={ci}
                  className={`px-2 py-1 ${
                    isPct
                      ? 'text-amber-700 font-mono text-right'
                      : isBigNum
                        ? 'text-blue-700 font-mono text-right'
                        : numericCol[ci]
                          ? 'text-graphite font-mono text-right'
                          : 'text-graphite'
                  }`}
                >
                  {inlineFormat(cell)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderMarkdown(content: string): ReactNode[] {
  const lines = content.split('\n');
  const out: ReactNode[] = [];
  let bullets: { text: string; depth: number }[] = [];
  let numbered: { text: string; depth: number }[] = [];
  let tableLines: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={key++} className="space-y-1 my-1">
        {bullets.map((b, i) => {
          const metric = isMetricLine(b.text);
          if (metric) {
            return (
              <li key={i} className={`flex items-center justify-between text-sm text-graphite ${b.depth >= 2 ? 'ml-6' : ''}`}>
                <span>{metric.label}</span>
                <span className={`font-mono ${metric.isPercent ? 'text-amber-700' : 'text-blue-700'}`}>
                  {metric.value}
                </span>
              </li>
            );
          }
          return (
            <li key={i} className={`flex items-start gap-2 text-sm text-graphite ${b.depth >= 2 ? 'ml-6' : ''}`}>
              <span
                className={`mt-1.5 rounded-full shrink-0 ${bulletDotColor(b.text)} ${
                  b.depth >= 2 ? 'w-1 h-1' : 'w-1.5 h-1.5'
                }`}
              />
              <span>{inlineFormat(b.text)}</span>
            </li>
          );
        })}
      </ul>,
    );
    bullets = [];
  };

  const flushNumbered = () => {
    if (numbered.length === 0) return;
    let topCount = 0;
    let subCount = 0;
    out.push(
      <ol key={key++} className="space-y-1 my-1">
        {numbered.map((n, i) => {
          let label: string;
          if (n.depth >= 2) {
            subCount += 1;
            label = `${topCount}.${subCount}`;
          } else {
            topCount += 1;
            subCount = 0;
            label = `${topCount}.`;
          }
          return (
            <li key={i} className={`flex items-start gap-2 text-sm text-graphite ${n.depth >= 2 ? 'ml-6' : ''}`}>
              <span className="text-purple-700 font-mono text-xs mt-0.5 shrink-0">{label}</span>
              <span>{inlineFormat(n.text)}</span>
            </li>
          );
        })}
      </ol>,
    );
    numbered = [];
  };

  const flushTable = () => {
    if (tableLines.length === 0) return;
    out.push(renderTable(tableLines, key++));
    tableLines = [];
  };

  const flushAll = () => {
    flushBullets();
    flushNumbered();
    flushTable();
  };

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();

    if (trimmed.startsWith('|') || /^\s*\|?.*\|.*\|/.test(trimmed)) {
      flushBullets();
      flushNumbered();
      tableLines.push(line);
      continue;
    }
    flushTable();

    if (trimmed === '') {
      flushAll();
      out.push(<div key={key++} className="h-1" />);
      continue;
    }

    if (trimmed === '---') {
      flushAll();
      out.push(<hr key={key++} className="border-silver my-3" />);
      continue;
    }

    const h2 = trimmed.match(/^##\s+(.*)$/);
    if (h2) {
      flushAll();
      out.push(
        <div key={key++} className="flex items-center gap-2 mt-3 mb-1">
          <span className="text-purple-600">◆</span>
          <span className="text-xs tracking-widest uppercase font-bold text-obsidian">{h2[1]}</span>
        </div>,
      );
      continue;
    }

    const h3 = trimmed.match(/^###\s+(.*)$/);
    if (h3) {
      flushAll();
      out.push(
        <div key={key++} className="flex items-center gap-2 mt-2 mb-1">
          <span className="w-1 h-3 rounded bg-purple-500" />
          <span className="text-sm font-semibold text-purple-700">{h3[1]}</span>
        </div>,
      );
      continue;
    }

    const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (bullet) {
      flushNumbered();
      const depth = bullet[1].length >= 2 ? 2 : 1;
      bullets.push({ text: bullet[2], depth });
      continue;
    }

    const num = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (num) {
      flushBullets();
      const depth = num[1].length >= 2 ? 2 : 1;
      numbered.push({ text: num[2], depth });
      continue;
    }

    flushAll();

    const boldLine = trimmed.match(/^\*\*(.+)\*\*$/);
    if (boldLine) {
      out.push(
        <div key={key++} className="bg-bone border border-silver rounded-lg px-3 py-2 my-1 text-sm text-obsidian font-semibold">
          {boldLine[1]}
        </div>,
      );
      continue;
    }

    out.push(
      <p key={key++} className="text-graphite text-sm leading-relaxed">
        {inlineFormat(trimmed)}
      </p>,
    );
  }

  flushAll();
  return out;
}

export default function AiChatMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-end gap-3 justify-end">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl rounded-br-sm px-4 py-3 max-w-lg shadow-ai-card">
          <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-bone border border-silver flex items-center justify-center shrink-0">
          <User size={13} className="text-graphite" />
        </div>
      </div>
    );
  }

  const avatar = (
    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-ai-card">
      <Sparkles size={13} className="text-white" />
    </div>
  );

  if (message.isStreaming && !message.content) {
    return (
      <div className="flex items-start gap-3">
        {avatar}
        <div className="inline-flex items-center gap-1.5 bg-paper border border-silver rounded-full px-4 py-2.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Streaming finished but no content arrived (network error, empty response, etc.).
  // Render a subtle error notice rather than a ghost empty bubble.
  if (!message.content) {
    return (
      <div className="flex items-start gap-3">
        {avatar}
        <div className="flex-1 min-w-0 bg-paper border border-silver rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-sm italic text-slate">No response received. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {avatar}
      <div className="flex-1 min-w-0 bg-paper border border-silver rounded-2xl rounded-tl-sm px-4 py-3">
        {renderMarkdown(message.content)}
      </div>
    </div>
  );
}

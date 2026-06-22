import type { ReactNode } from 'react';
import { Bot, User } from 'lucide-react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function inlineFormat(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={key++} className="text-obsidian font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code key={key++} className="bg-silver/40 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono">
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = match.index + token.length;
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
  return (
    <table key={key} className="w-full text-xs my-2 border-collapse">
      <thead>
        <tr className="bg-bone uppercase text-slate">
          {header.map((h, i) => (
            <th key={i} className="px-2 py-1 text-left border-b border-silver">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row, ri) => (
          <tr key={ri} className="border-b border-silver">
            {row.map((cell, ci) => {
              const isPct = /^\d+(\.\d+)?%$/.test(cell);
              const isBigNum = /^\d{2,}$/.test(cell);
              return (
                <td
                  key={ci}
                  className={`px-2 py-1 ${
                    isPct
                      ? 'text-amber-700 font-mono'
                      : isBigNum
                        ? 'text-blue-700 font-mono'
                        : 'text-graphite'
                  }`}
                >
                  {cell}
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
      <div className="flex items-start gap-3 justify-end">
        <div className="bg-emerald-100 border border-emerald-200 rounded-2xl rounded-tr-sm px-4 py-3 max-w-lg">
          <p className="text-obsidian text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-bone flex items-center justify-center shrink-0">
          <User size={15} className="text-graphite" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
        <Bot size={15} className="text-purple-600" />
      </div>
      <div className="bg-paper border border-silver rounded-2xl px-4 py-3 max-w-2xl flex-1">
        {renderMarkdown(message.content)}
      </div>
    </div>
  );
}

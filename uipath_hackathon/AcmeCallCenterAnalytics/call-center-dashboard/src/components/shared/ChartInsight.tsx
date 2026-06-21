import { Sparkles } from 'lucide-react';

interface ChartInsightProps {
  text: string;
}

export default function ChartInsight({ text }: ChartInsightProps) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-badge bg-bone px-3 py-2 text-sm text-graphite">
      <Sparkles size={14} className="mt-0.5 shrink-0 text-slate" />
      <p>{text}</p>
    </div>
  );
}

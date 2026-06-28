import { Info } from 'lucide-react';

export default function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group/tip relative inline-flex shrink-0">
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full bg-silver/70 hover:bg-silver transition-colors"
      >
        <Info size={9} className="text-slate" />
      </button>
      <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-50 w-56 rounded-xl border border-silver bg-paper px-3 py-2.5 text-[11px] leading-relaxed text-graphite opacity-0 shadow-card transition-opacity duration-150 group-hover/tip:opacity-100">
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-silver bg-paper" />
        {text}
      </div>
    </div>
  );
}

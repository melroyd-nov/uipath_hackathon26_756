import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-mist bg-paper p-12 text-center">
      <span className="text-mist">{icon ?? <Inbox size={28} />}</span>
      <p className="font-medium text-obsidian">{title}</p>
      {description && <p className="text-sm text-slate">{description}</p>}
    </div>
  );
}

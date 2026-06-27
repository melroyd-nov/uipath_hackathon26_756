import Lottie from 'lottie-react';
import type { ReactNode } from 'react';
import emptyAnimation from '../../assets/lottie/empty.json';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <Lottie
        animationData={emptyAnimation}
        loop
        autoplay
        style={{ width: 120, height: 120 }}
      />
      <div>
        <p className="text-[13px] font-semibold text-[#0F1F4C]">{title}</p>
        {description && (
          <p className="mt-1 text-[11px] text-[#9CA3AF]">{description}</p>
        )}
      </div>
    </div>
  );
}

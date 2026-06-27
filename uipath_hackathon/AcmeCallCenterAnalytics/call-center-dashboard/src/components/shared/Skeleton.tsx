interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-[4px] bg-[rgba(15,31,76,0.06)] ${className}`} />;
}

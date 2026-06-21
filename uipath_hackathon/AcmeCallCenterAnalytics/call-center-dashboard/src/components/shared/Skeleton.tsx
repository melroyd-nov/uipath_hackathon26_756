interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-badge bg-bone ${className}`} />;
}

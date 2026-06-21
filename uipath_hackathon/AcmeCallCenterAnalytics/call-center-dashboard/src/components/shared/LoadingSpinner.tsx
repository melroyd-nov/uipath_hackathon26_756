export default function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-silver border-t-obsidian"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

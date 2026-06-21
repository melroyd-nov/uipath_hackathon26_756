import { Sparkles } from 'lucide-react';

export default function AiOrbIcon({ size = 22 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-lilac-bloom to-sky-veil text-obsidian"
      style={{ width: size * 1.8, height: size * 1.8 }}
    >
      <Sparkles size={size} />
    </span>
  );
}

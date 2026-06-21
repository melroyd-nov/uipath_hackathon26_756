import { useEffect, useState } from 'react';
import AiOrbIcon from './AiOrbIcon';

const PHASES = ['Scanning call data…', 'Analyzing trends…', 'Drafting insights…'];

export default function AiThinkingState() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 py-6">
      <AiOrbIcon size={18} />
      <span className="text-sm text-slate">{PHASES[phase]}</span>
    </div>
  );
}

import { Lightbulb } from 'lucide-react';

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (q: string) => void;
}

export default function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Lightbulb size={13} className="text-amber-600" />
        <span className="text-slate text-xs">Suggested questions</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            className="text-left text-xs text-graphite bg-bone hover:bg-silver/40 border border-silver hover:border-mist rounded-xl px-4 py-3 transition-all duration-150 leading-relaxed"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

import { MessageSquareText } from 'lucide-react';

export function AssistantThinkingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Scholaroscope is thinking"
      className="mr-auto flex min-h-14 max-w-full items-center gap-3 rounded-2xl border theme-border bg-[color:var(--color-surface)] px-4 py-3"
    >
      <MessageSquareText
        aria-hidden="true"
        className="h-5 w-5 text-[color:var(--brand-primary)] motion-safe:animate-pulse motion-reduce:animate-none"
      />
      <span className="text-sm font-medium theme-text">Scholaroscope is thinking</span>
      <span aria-hidden="true" className="flex items-center gap-1">
        {[0, 160, 320].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-primary)] motion-safe:animate-pulse motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

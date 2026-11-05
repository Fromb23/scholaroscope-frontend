import { MessageSquareText } from 'lucide-react';
import type { AssistantExecutionStage } from '@/app/core/types/assistant';

export const ASSISTANT_STAGE_LABELS: Partial<Record<AssistantExecutionStage, string>> = {
  RECEIVED: 'Question received',
  INTERPRETING: 'Understanding your request',
  RESOLVING_CONTEXT: 'Checking the relevant school context',
  WAITING_FOR_PROVIDER: 'Preparing the analysis',
  SELECTING_TOOL: 'Selecting the appropriate analysis',
  TOOL_RUNNING: 'Analysing attendance',
  COMPOSING_RESPONSE: 'Almost done — preparing your response',
  CLARIFICATION_REQUIRED: 'Preparing a clarification',
};

export function AssistantThinkingIndicator({ stage, longRunning = false }: { stage?: AssistantExecutionStage | null; longRunning?: boolean }) {
  const label = stage ? ASSISTANT_STAGE_LABELS[stage] : 'Question received';
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
      <span className="text-sm font-medium theme-text">{label}</span>
      <span aria-hidden="true" className="flex items-center gap-1">
        {[0, 160, 320].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-primary)] motion-safe:animate-pulse motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      {longRunning ? <span className="block text-xs theme-muted">This is taking longer than usual. Scholaroscope is still working.</span> : null}
    </div>
  );
}

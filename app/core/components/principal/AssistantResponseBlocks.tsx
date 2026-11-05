import Link from 'next/link';

import type {
  AssistantAction,
  AssistantResponseBlock,
} from '@/app/core/types/assistant';
import {
  AssistantProgressiveText,
  isStructuredAssistantMarkdown,
} from '@/app/core/components/assistant/AssistantProgressiveText';

interface AssistantResponseBlocksProps {
  blocks: AssistantResponseBlock[];
  progressive?: boolean;
  onProgressiveComplete?: () => void;
  onProgressiveProgress?: () => void;
}

function labelFor(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeExternalHref(href?: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function renderAction(action: AssistantAction, index: number) {
  if (action.type === 'navigate' && action.href?.startsWith('/')) {
    return (
      <Link key={`${action.label}-${index}`} href={action.href} className="theme-focus-ring rounded-lg border theme-border px-3 py-2 text-sm font-medium theme-text">
        {action.label}
      </Link>
    );
  }
  if (action.type === 'external') {
    const href = safeExternalHref(action.href);
    return href ? (
      <a key={`${action.label}-${index}`} href={href} target="_blank" rel="noreferrer" className="theme-focus-ring rounded-lg border theme-border px-3 py-2 text-sm font-medium theme-text">
        {action.label}
      </a>
    ) : null;
  }
  if (['page_action', 'feedback', 'chat_prompt'].includes(action.type)) {
    return (
      <span key={`${action.label}-${index}`} className="rounded-lg border theme-border px-3 py-2 text-sm font-medium theme-muted">
        {action.label}
      </span>
    );
  }
  return null;
}

function safeErrorMessage(code: string): string {
  if (code === 'assistant_provider_timeout') {
    return 'The response took too long to complete. Please retry.';
  }
  if (code === 'assistant_response_rejected') {
    return 'I couldn’t complete that response safely. Please retry.';
  }
  return 'The response could not be completed. Please retry.';
}

export function AssistantResponseBlocks({
  blocks,
  progressive = false,
  onProgressiveComplete,
  onProgressiveProgress,
}: AssistantResponseBlocksProps) {
  const progressiveMarkdownIndices = blocks.flatMap((block, index) => (
    block.type === 'markdown' && !isStructuredAssistantMarkdown(block.text) ? [index] : []
  ));
  const finalProgressiveIndex = progressiveMarkdownIndices.at(-1);
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'markdown':
            return (
              <AssistantProgressiveText
                key={index}
                text={block.text}
                active={progressive}
                onProgress={onProgressiveProgress}
                onComplete={index === finalProgressiveIndex ? onProgressiveComplete : undefined}
              />
            );
          case 'metrics':
            return (
              <dl key={index} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {Object.entries(block.values).map(([label, value]) => (
                  <div key={label} className="min-w-24 rounded-lg border theme-border bg-[color:var(--color-surface)] px-3 py-2">
                    <dt className="text-xs theme-muted">{labelFor(label)}</dt>
                    <dd className="mt-1 text-lg font-semibold theme-text">{value}</dd>
                  </div>
                ))}
              </dl>
            );
          case 'table':
            return (
              <div key={index} className="overflow-x-auto rounded-lg border theme-border">
                <table className="w-full min-w-max text-left text-sm">
                  <thead className="border-b theme-border bg-black/5">
                    <tr>{block.columns.map((column) => <th key={column} className="px-3 py-2 font-medium theme-text">{labelFor(column)}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>{block.columns.map((column) => <td key={column} className="px-3 py-2 theme-text">{row[column] ?? ''}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'clarification':
            return <p key={index} className="rounded-lg border theme-border bg-black/5 p-3 text-sm theme-text">{block.question}</p>;
          case 'unsupported_capability':
            return <p key={index} className="rounded-lg border theme-border p-3 text-sm theme-muted">{block.message}</p>;
          case 'error':
            return (
              <div key={index} role="alert" className="rounded-lg border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/5 p-3">
                <p className="text-sm theme-text">{safeErrorMessage(block.code)}</p>
              </div>
            );
          case 'actions':
            return <div key={index} className="flex flex-wrap gap-2">{block.actions.map(renderAction)}</div>;
          default:
            return null;
        }
      })}
    </div>
  );
}

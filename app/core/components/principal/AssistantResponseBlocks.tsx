import Link from 'next/link';

import type {
  AssistantAction,
  AssistantRunDiagnostics,
  AssistantResponseBlock,
} from '@/app/core/types/assistant';
import {
  AssistantProgressiveText,
  isStructuredAssistantMarkdown,
} from '@/app/core/components/assistant/AssistantProgressiveText';

interface AssistantResponseBlocksProps {
  blocks: AssistantResponseBlock[];
  progressive?: boolean;
  responseIdentity?: string | number;
  onProgressiveComplete?: () => void;
  onProgressiveProgress?: () => void;
  onRetry?: () => void;
  diagnostics?: AssistantRunDiagnostics;
}

function labelFor(value: string): string {
  if (value === 'admission_number') return 'Admission number';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayTableValue(column: string, value: string | number | boolean | null | undefined): string {
  if (column === 'admission_number' && (value === null || value === undefined || value === '')) {
    return 'Unavailable';
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value === null || value === undefined ? '' : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDisplayValue(value: unknown): value is string | number | boolean | null {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isAssistantAction(value: unknown): value is AssistantAction {
  return isRecord(value)
    && typeof value.label === 'string'
    && typeof value.type === 'string'
    && ['navigate', 'page_action', 'feedback', 'external', 'chat_prompt'].includes(value.type);
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
  responseIdentity,
  onProgressiveComplete,
  onProgressiveProgress,
  onRetry,
  diagnostics,
}: AssistantResponseBlocksProps) {
  const progressiveMarkdownIndices = blocks.flatMap((block, index) => (
    isRecord(block)
      && block.type === 'markdown'
      && typeof block.text === 'string'
      && !isStructuredAssistantMarkdown(block.text)
      ? [index]
      : []
  ));
  const finalProgressiveIndex = progressiveMarkdownIndices.at(-1);
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (!isRecord(block) || typeof block.type !== 'string') return null;
        switch (block.type) {
          case 'markdown':
            if (typeof block.text !== 'string') return null;
            return (
              <AssistantProgressiveText
                key={index}
                text={block.text}
                active={progressive}
                revealKey={responseIdentity === undefined ? undefined : `${responseIdentity}:${index}`}
                onProgress={onProgressiveProgress}
                onComplete={index === finalProgressiveIndex ? onProgressiveComplete : undefined}
              />
            );
          case 'metrics':
            if (!isRecord(block.values)) return null;
            return (
              <dl key={index} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {Object.entries(block.values).filter((entry): entry is [string, number] => (
                  typeof entry[1] === 'number' && Number.isFinite(entry[1])
                )).map(([label, value]) => (
                  <div key={label} className="min-w-24 rounded-lg border theme-border bg-[color:var(--color-surface)] px-3 py-2">
                    <dt className="text-xs theme-muted">{labelFor(label)}</dt>
                    <dd className="mt-1 text-lg font-semibold theme-text">{value}</dd>
                  </div>
                ))}
              </dl>
            );
          case 'table': {
            if (!Array.isArray(block.columns) || !Array.isArray(block.rows)) return null;
            const visibleColumns = block.columns.filter((column): column is string => (
              typeof column === 'string' && column !== 'learner_id'
            ));
            const rows = block.rows.filter(isRecord);
            if (visibleColumns.length === 0) return null;
            return (
              <div key={index} className="max-w-full overflow-x-auto rounded-lg border theme-border" tabIndex={0} aria-label="Scrollable results table">
                <table className="w-full min-w-max text-left text-sm">
                  <caption className="sr-only">Assistant results</caption>
                  <thead className="border-b theme-border bg-black/5">
                    <tr>{visibleColumns.map((column) => <th key={column} className="px-3 py-2 font-medium theme-text">{labelFor(column)}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                    {rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>{visibleColumns.map((column) => {
                        const value = row[column];
                        return <td key={column} className="px-3 py-2 theme-text">{displayTableValue(column, isDisplayValue(value) ? value : null)}</td>;
                      })}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          case 'details': {
            if (!Array.isArray(block.items)) return null;
            const items = block.items.filter((item): item is { label: string; value: string | number | boolean | null } => (
              isRecord(item) && typeof item.label === 'string' && isDisplayValue(item.value)
            ));
            if (items.length === 0) return null;
            return (
              <dl key={index} className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
                {items.map((item, itemIndex) => (
                  <div key={`${item.label}-${itemIndex}`} className="contents">
                    <dt className="font-medium theme-muted">{item.label}</dt>
                    <dd className="theme-text">{displayTableValue('', item.value)}</dd>
                  </div>
                ))}
              </dl>
            );
          }
          case 'notice':
            if (typeof block.text !== 'string' || (block.tone !== 'info' && block.tone !== 'warning')) return null;
            return (
              <aside
                key={index}
                aria-label={typeof block.title === 'string' ? block.title : 'Additional information'}
                className={`rounded-lg border p-3 text-sm ${block.tone === 'warning' ? 'border-amber-500/40 bg-amber-500/5' : 'theme-border bg-black/5'}`}
              >
                {typeof block.title === 'string' ? <p className="font-medium theme-text">{block.title}</p> : null}
                <p className={`${typeof block.title === 'string' ? 'mt-1 ' : ''}whitespace-pre-wrap leading-6 theme-text`}>{block.text}</p>
              </aside>
            );
          case 'clarification':
            if (typeof block.question !== 'string') return null;
            return <p key={index} className="rounded-lg border theme-border bg-black/5 p-3 text-sm theme-text">{block.question}</p>;
          case 'unsupported_capability':
            if (typeof block.message !== 'string') return null;
            return <p key={index} className="whitespace-pre-wrap text-sm leading-6 theme-text">{block.message}</p>;
          case 'error':
            if (typeof block.code !== 'string') return null;
            return (
              <div key={index} role="alert" className="rounded-lg border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/5 p-3">
                <p className="text-sm theme-text">{safeErrorMessage(block.code)}</p>
                {onRetry ? <button type="button" onClick={onRetry} className="theme-focus-ring mt-2 rounded underline text-sm">Retry</button> : null}
                {diagnostics ? (
                  <details className="mt-3 text-xs theme-muted">
                    <summary className="cursor-pointer">Development diagnostics</summary>
                    <dl className="mt-2 grid grid-cols-2 gap-1">
                      <dt>Run</dt><dd>{diagnostics.run_id}</dd>
                      <dt>Stage</dt><dd>{diagnostics.stage}</dd>
                      <dt>Failure</dt><dd>{diagnostics.failure_code ?? '—'}</dd>
                      <dt>Latency</dt><dd>{diagnostics.latency_ms} ms</dd>
                      <dt>Tool</dt><dd>{diagnostics.tool_selected ?? 'None'}</dd>
                    </dl>
                  </details>
                ) : null}
              </div>
            );
          case 'actions':
            if (!Array.isArray(block.actions)) return null;
            return <div key={index} className="flex flex-wrap gap-2">{block.actions.filter(isAssistantAction).map(renderAction)}</div>;
          default:
            return null;
        }
      })}
    </div>
  );
}

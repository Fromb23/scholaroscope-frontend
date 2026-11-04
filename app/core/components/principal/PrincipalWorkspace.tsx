'use client';

import { FormEvent, useState } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  BookOpenCheck,
  MessageSquareText,
  RefreshCw,
  School,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import { useCurrentAcademicYear, useCurrentTerm } from '@/app/core/hooks/useAcademic';

const SUGGESTED_QUESTIONS = [
  'What requires my attention today?',
  'How is Grade 10 performing this term?',
  'Which projects have incomplete evaluations?',
  'Which classes have unusual attendance patterns?',
  'Which teachers have recorded observations that have not become evidence?',
] as const;

export type PrincipalWorkspaceState = 'ready' | 'loading' | 'error';

interface PrincipalWorkspaceShellProps {
  workspaceName: string;
  academicYearName?: string | null;
  termName?: string | null;
  state?: PrincipalWorkspaceState;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function PrincipalWorkspaceShell({
  workspaceName,
  academicYearName,
  termName,
  state = 'ready',
  errorMessage,
  onRetry,
}: PrincipalWorkspaceShellProps) {
  const [prompt, setPrompt] = useState('');
  const [foundationNotice, setFoundationNotice] = useState<string | null>(null);

  const submitPrompt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    setFoundationNotice(
      'School intelligence is not connected yet. Your question was not sent or answered.',
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5" aria-busy={state === 'loading'}>
      <header className="theme-card overflow-hidden rounded-2xl border theme-border p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="theme-brand-icon rounded-xl p-3">
              <School className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="theme-subtle text-xs font-semibold uppercase tracking-wider">
                Principal oversight
              </p>
              <h1 className="mt-1 text-2xl font-semibold theme-text">{workspaceName}</h1>
              <p className="mt-1 text-sm theme-text-muted">
                {academicYearName ?? 'Academic year not available'}
                {' · '}
                {termName ?? 'Current term not available'}
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border theme-border px-3 py-1.5 text-xs font-medium theme-text-muted">
            <ShieldCheck className="h-4 w-4 text-[color:var(--color-success)]" />
            Permission-bounded oversight
          </div>
        </div>
      </header>

      {state === 'loading' ? (
        <p role="status" className="theme-card rounded-xl border theme-border p-3 text-sm theme-text-muted">
          Preparing academic context. The prompt shell remains available.
        </p>
      ) : state === 'error' ? (
        <section role="alert" className="theme-card rounded-xl border theme-border p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-warning)]" />
            <div className="flex-1">
              <h2 className="font-semibold theme-text">Academic context unavailable</h2>
              <p className="mt-1 text-sm theme-text-muted">
                {errorMessage ?? 'The current academic year and term could not be loaded.'}
                {' '}You still have access to the Principal workspace.
              </p>
            </div>
            {onRetry ? <button type="button" onClick={onRetry} className="theme-focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border theme-border px-3 text-sm theme-text"><RefreshCw className="h-4 w-4" />Retry context</button> : null}
          </div>
        </section>
      ) : null}

      <section aria-label="Oversight status" className="grid gap-3 sm:grid-cols-3">
        <StatusItem
          icon={ShieldCheck}
          label="Authority"
          value="Backend-verified Principal context"
        />
        <StatusItem
          icon={BookOpenCheck}
          label="Academic context"
          value={termName ? `${academicYearName ?? 'Current year'} · ${termName}` : 'No active term available'}
        />
        <StatusItem
          icon={MessageSquareText}
          label="Intelligence"
          value="Governed service not connected"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <main className="theme-card flex min-h-[31rem] flex-col rounded-2xl border theme-border">
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center sm:px-10">
            <div className="theme-surface-muted rounded-2xl p-4">
              <MessageSquareText className="h-8 w-8 theme-muted" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-semibold theme-text">Ask about your school</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 theme-text-muted">
              This is the conversation foundation for governed school-level intelligence.
              It does not generate answers until an authorized intelligence service and
              source-provenance contract are connected.
            </p>

            <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={state !== 'ready'}
                  onClick={() => {
                    setPrompt(question);
                    setFoundationNotice(null);
                  }}
                  className="theme-focus-ring rounded-full border theme-border px-3 py-2 text-left text-xs font-medium theme-text theme-hover-surface disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t theme-border p-4 sm:p-5">
            <form onSubmit={submitPrompt} aria-label="Principal school question" className="space-y-2">
              <label htmlFor="principal-prompt" className="sr-only">
                Ask a school-level question
              </label>
              <div className="theme-card-muted flex items-end gap-2 rounded-2xl border theme-border p-2">
                <textarea
                  id="principal-prompt"
                  value={prompt}
                  onChange={(event) => {
                    setPrompt(event.target.value);
                    setFoundationNotice(null);
                  }}
                  rows={2}
                  placeholder="Ask a school-level question…"
                  className="min-h-14 flex-1 resize-none bg-transparent px-3 py-2 text-sm theme-text outline-none placeholder:theme-subtle"
                />
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  aria-label="Submit question"
                  className="theme-focus-ring theme-brand-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
              {foundationNotice ? (
                <p role="status" className="px-1 text-xs theme-text-muted">
                  {foundationNotice}
                </p>
              ) : null}
            </form>
          </div>
        </main>

        <aside className="space-y-4" aria-label="Principal workspace context">
          <section className="theme-card rounded-2xl border theme-border p-5">
            <h2 className="text-sm font-semibold theme-text">Sources and provenance</h2>
            <div className="mt-4 rounded-xl border border-dashed theme-border p-4">
              <p className="text-sm theme-text-muted">No answer sources to display.</p>
              <p className="mt-1 text-xs leading-5 theme-subtle">
                Future answers will identify the governed services and school records used.
              </p>
            </div>
          </section>
          <section className="theme-card rounded-2xl border theme-border p-5">
            <h2 className="text-sm font-semibold theme-text">How authority works</h2>
            <p className="mt-2 text-xs leading-5 theme-text-muted">
              Questions will be limited by your active Principal assignment, underlying
              domain permissions, workspace scope, plugin entitlement, and data-access policy.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatusItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="theme-card flex items-start gap-3 rounded-xl border theme-border p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 theme-muted" aria-hidden="true" />
      <div>
        <p className="theme-subtle text-[0.7rem] font-semibold uppercase tracking-wider">{label}</p>
        <p className="mt-1 text-sm font-medium theme-text">{value}</p>
      </div>
    </div>
  );
}

export function PrincipalWorkspace() {
  const { activeOrg } = useAuth();
  const academicYear = useCurrentAcademicYear();
  const term = useCurrentTerm();
  const loading = academicYear.loading || term.loading;
  const error = academicYear.error || term.error;

  return (
    <PrincipalWorkspaceShell
      workspaceName={activeOrg?.name ?? 'Current workspace'}
      academicYearName={academicYear.currentYear?.name}
      termName={term.currentTerm?.name}
      state={loading ? 'loading' : error ? 'error' : 'ready'}
      errorMessage={error}
      onRetry={() => {
        void academicYear.refetch();
        void term.refetch();
      }}
    />
  );
}

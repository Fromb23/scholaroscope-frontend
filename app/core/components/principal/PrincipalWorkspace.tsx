'use client';

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
  History,
  Menu,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import { useCurrentAcademicYear, useCurrentTerm } from '@/app/core/hooks/useAcademic';
import { AssistantResponseBlocks } from '@/app/core/components/principal/AssistantResponseBlocks';
import {
  type PrincipalConversationMessageState,
  usePrincipalConversationMessages,
} from '@/app/core/hooks/usePrincipalConversationMessages';
import {
  type PrincipalConversationState,
  usePrincipalConversations,
} from '@/app/core/hooks/usePrincipalConversations';
import type { AssistantConversation } from '@/app/core/types/assistant';

const MAX_TITLE_LENGTH = 120;

interface ConversationRowProps {
  conversation: AssistantConversation;
  active: boolean;
  renaming: boolean;
  renameFailed: boolean;
  onRename: (conversationId: number, title: string) => Promise<boolean>;
  onNavigate?: () => void;
}

function ConversationRow({
  conversation,
  active,
  renaming,
  renameFailed,
  onRename,
  onNavigate,
}: ConversationRowProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [validation, setValidation] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setTitle(conversation.title), [conversation.title]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = () => {
    setTitle(conversation.title);
    setValidation(null);
    setEditing(false);
  };

  const save = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setValidation('Enter a conversation title.');
      return;
    }
    if (nextTitle.length > MAX_TITLE_LENGTH) {
      setValidation(`Use ${MAX_TITLE_LENGTH} characters or fewer.`);
      return;
    }
    setValidation(null);
    if (await onRename(conversation.id, nextTitle)) setEditing(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void save();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-[color:var(--brand-primary)]/40 bg-[color:var(--color-surface)] p-2">
        <label className="sr-only" htmlFor={`conversation-title-${conversation.id}`}>
          Rename {conversation.title}
        </label>
        <input
          ref={inputRef}
          id={`conversation-title-${conversation.id}`}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setValidation(null);
          }}
          onKeyDown={onKeyDown}
          maxLength={MAX_TITLE_LENGTH + 1}
          className="theme-input w-full rounded-md px-2 py-1.5 text-sm"
          aria-invalid={Boolean(validation)}
          aria-describedby={validation ? `conversation-title-error-${conversation.id}` : undefined}
          disabled={renaming}
        />
        {validation ? (
          <p id={`conversation-title-error-${conversation.id}`} className="mt-1 text-xs text-[color:var(--color-danger)]">
            {validation}
          </p>
        ) : null}
        <div className="mt-2 flex justify-end gap-1">
          <button
            type="button"
            onClick={cancel}
            disabled={renaming}
            className="theme-focus-ring rounded-md p-1.5 theme-hover-surface"
            aria-label="Cancel rename"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={renaming}
            className="theme-focus-ring rounded-md p-1.5 text-[color:var(--brand-primary)] theme-hover-surface disabled:opacity-50"
            aria-label="Save conversation title"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group grid grid-cols-[minmax(0,1fr)_2rem] items-center rounded-lg border ${
        active
          ? 'border-[color:var(--brand-primary)]/40 bg-[color:var(--brand-primary)]/10'
          : 'border-transparent theme-hover-surface'
      }`}
    >
      <Link
        href={`/principal/conversations/${conversation.id}`}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        title={conversation.title}
        className="theme-focus-ring min-w-0 rounded-lg px-2.5 py-2 text-sm theme-text"
      >
        <span className="block truncate">{conversation.title}</span>
        {active ? <span className="sr-only">Active conversation</span> : null}
      </Link>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="theme-focus-ring rounded-md p-2 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
        aria-label={`Rename ${conversation.title}`}
        title="Rename conversation"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {renameFailed ? (
        <p role="alert" className="col-span-2 px-2.5 pb-2 text-xs text-[color:var(--color-danger)]">
          The title could not be saved. Your previous title was restored.
        </p>
      ) : null}
    </div>
  );
}

interface ConversationSidebarProps {
  state: PrincipalConversationState;
  activeConversationId: number | null;
  newConversationActive: boolean;
  workspaceName: string;
  onNavigate?: () => void;
}

function ConversationSidebar({
  state,
  activeConversationId,
  newConversationActive,
  workspaceName,
  onNavigate,
}: ConversationSidebarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const rows = state.searchActive ? state.searchResults : state.recent;

  const renderRow = (conversation: AssistantConversation) => (
    <ConversationRow
      key={conversation.id}
      conversation={conversation}
      active={conversation.id === activeConversationId}
      renaming={state.renamingId === conversation.id}
      renameFailed={state.renameErrorId === conversation.id}
      onRename={state.renameConversation}
      onNavigate={onNavigate}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[color:var(--color-surface)]">
      <div className="border-b theme-border px-4 py-4">
        <p className="truncate text-sm font-semibold theme-text" title={workspaceName}>
          {workspaceName}
        </p>
        <Link
          href="/principal"
          onClick={onNavigate}
          aria-current={newConversationActive ? 'page' : undefined}
          className={`theme-focus-ring mt-4 flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${
            newConversationActive
              ? 'border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-white'
              : 'theme-border theme-hover-surface theme-text'
          }`}
        >
          <Plus className="h-4 w-4" />
          New conversation
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider theme-subtle">
          Recent conversations
        </h2>
        <label htmlFor="principal-conversation-search" className="sr-only">
          Search conversations
        </label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 theme-subtle" />
          <input
            id="principal-conversation-search"
            type="search"
            value={state.searchInput}
            onChange={(event) => state.setSearchInput(event.target.value)}
            placeholder="Search conversations"
            className="theme-input w-full rounded-lg py-2 pl-8 pr-3 text-sm"
          />
        </div>

        <div className="mt-4">
          <p className="px-1 text-xs font-medium theme-muted">Conversation history</p>
          <div className="mt-2 space-y-1" aria-live="polite">
            {state.searchLoading && rows.length === 0 ? (
              <p role="status" className="px-2 py-3 text-xs theme-muted">Searching conversations…</p>
            ) : state.recentLoading && !state.searchActive ? (
              <p role="status" className="px-2 py-3 text-xs theme-muted">Loading recent conversations…</p>
            ) : state.searchError ? (
              <p role="alert" className="px-2 py-3 text-xs text-[color:var(--color-danger)]">Search is unavailable. Try again.</p>
            ) : state.recentError && !state.searchActive ? (
              <div className="px-2 py-3 text-xs theme-muted">
                <p>Conversation history is unavailable.</p>
                <button type="button" onClick={state.retryRecent} className="theme-focus-ring mt-2 rounded underline">Retry history</button>
              </div>
            ) : rows.length === 0 ? (
              <p className="px-2 py-3 text-xs theme-muted">
                {state.searchActive ? 'No conversations match your search.' : 'Your conversations will appear here.'}
              </p>
            ) : rows.map(renderRow)}
          </div>

          {state.searchActive && state.searchHasNext ? (
            <button
              type="button"
              onClick={() => void state.loadMoreSearch()}
              disabled={state.searchLoading}
              className="theme-focus-ring mt-2 w-full rounded-lg px-3 py-2 text-xs font-medium theme-hover-surface theme-text disabled:opacity-50"
            >
              {state.searchLoading ? 'Loading more results…' : 'More search results'}
            </button>
          ) : null}

          {!state.searchActive && state.recentCount > 10 ? (
            <div className="mt-3 border-t theme-border pt-2">
              <button
                type="button"
                aria-expanded={moreOpen}
                onClick={() => {
                  const nextOpen = !moreOpen;
                  setMoreOpen(nextOpen);
                  if (nextOpen && state.older.length === 0) void state.loadOlder();
                }}
                className="theme-focus-ring flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium theme-hover-surface theme-text"
              >
                More conversations
                <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen ? (
                <div className="mt-1 max-h-64 space-y-1 overflow-y-auto rounded-lg" tabIndex={0}>
                  {state.older.map(renderRow)}
                  {state.olderLoading ? <p role="status" className="px-2 py-3 text-xs theme-muted">Loading older conversations…</p> : null}
                  {state.olderError ? (
                    <div className="px-2 py-2 text-xs text-[color:var(--color-danger)]">
                      <p>Older conversations could not be loaded.</p>
                      <button type="button" onClick={() => void state.loadOlder()} className="theme-focus-ring mt-1 rounded underline">Retry</button>
                    </div>
                  ) : null}
                  {!state.olderLoading && state.older.length === 0 && !state.olderError ? (
                    <p className="px-2 py-3 text-xs theme-muted">No older conversations.</p>
                  ) : null}
                  {state.olderHasNext && state.older.length > 0 ? (
                    <button type="button" onClick={() => void state.loadOlder()} disabled={state.olderLoading} className="theme-focus-ring w-full rounded-lg px-2 py-2 text-xs font-medium theme-hover-surface disabled:opacity-50">
                      Load more
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <nav aria-label="Principal secondary navigation" className="space-y-1 border-t theme-border p-3">
        <Link href="/principal/academic-overview" onClick={onNavigate} className="theme-focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm theme-hover-surface theme-text">
          <BookOpen className="h-4 w-4" />
          Academic overview
        </Link>
        <Link href="/profile" onClick={onNavigate} className="theme-focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm theme-hover-surface theme-text">
          <User className="h-4 w-4" />
          Profile
        </Link>
      </nav>
    </div>
  );
}

interface ConversationCanvasProps {
  state: PrincipalConversationState;
  messageState: PrincipalConversationMessageState;
  isBlank: boolean;
  canSend: boolean;
  academicYearName?: string | null;
  termName?: string | null;
  contextUnavailable: boolean;
  contextLoading: boolean;
  onRetryContext: () => void;
  onOpenHistory: () => void;
  onConversationCreated: (conversationId: number) => void;
}

function ConversationCanvas({
  state,
  messageState,
  isBlank,
  canSend,
  academicYearName,
  termName,
  contextUnavailable,
  contextLoading,
  onRetryContext,
  onOpenHistory,
  onConversationCreated,
}: ConversationCanvasProps) {
  const [prompt, setPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messageState.messages.length, messageState.sending]);

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!canSend || !prompt.trim() || messageState.sending) return;
    const persistedConversationId = await messageState.submitMessage(prompt);
    if (persistedConversationId !== null) {
      setPrompt('');
      if (isBlank) onConversationCreated(persistedConversationId);
    }
  };

  const retry = async () => {
    const persistedConversationId = await messageState.retrySubmission();
    if (persistedConversationId !== null) {
      setPrompt('');
      if (isBlank) onConversationCreated(persistedConversationId);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const deleteActiveConversation = async () => {
    const conversation = state.activeConversation;
    if (!conversation) return;
    if (!window.confirm(`Delete "${conversation.title}"? This conversation cannot be recovered.`)) return;
    await state.deleteConversation(conversation.id);
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[color:var(--color-background)]">
      <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b theme-border px-4 py-2 lg:px-6">
        <button type="button" onClick={onOpenHistory} className="theme-focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border theme-border px-3 text-sm theme-text lg:hidden" aria-label="Open conversation history">
          <Menu className="h-4 w-4" />
          Conversations
        </button>
        <p className="min-w-0 truncate text-sm font-medium theme-text">
          {!isBlank && state.activeConversation ? state.activeConversation.title : 'New conversation'}
        </p>
        <div className="flex items-center gap-2">
          {state.activeConversation ? (
            <button type="button" onClick={() => void deleteActiveConversation()} disabled={state.deletingId === state.activeConversation.id} aria-label={`Delete ${state.activeConversation.title}`} className="theme-focus-ring rounded-lg border theme-border p-2 text-[color:var(--color-danger)] disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <button type="button" disabled title="Sources appear with governed answers" className="theme-focus-ring rounded-lg border theme-border px-3 py-2 text-xs font-medium theme-muted disabled:cursor-not-allowed disabled:opacity-60">
            Sources
          </button>
        </div>
      </div>

      <div className="shrink-0 border-b theme-border px-4 py-2 text-xs theme-muted lg:px-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Principal oversight</span><span aria-hidden="true">·</span>
          <span>{contextLoading ? 'Academic context loading' : academicYearName ?? 'Academic year unavailable'}</span><span aria-hidden="true">·</span>
          <span>{contextLoading ? 'Term loading' : termName ?? 'No active term'}</span><span aria-hidden="true">·</span>
          <span>{canSend ? 'Governed intelligence' : 'Oversight context required'}</span>
          {contextUnavailable ? (
            <button type="button" onClick={onRetryContext} className="theme-focus-ring ml-1 inline-flex items-center gap-1 rounded underline" title="Academic context unavailable; retry">
              <RefreshCw className="h-3 w-3" /> Retry context
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.activeLoading ? (
          <div role="status" className="flex h-full min-h-72 items-center justify-center p-8 text-sm theme-muted">Opening conversation…</div>
        ) : state.activeUnavailable ? (
          <div role="alert" className="mx-auto flex h-full min-h-72 max-w-lg flex-col items-center justify-center p-8 text-center">
            <History className="h-8 w-8 theme-subtle" />
            <h1 className="mt-4 text-xl font-semibold theme-text">Conversation unavailable</h1>
            <p className="mt-2 text-sm theme-muted">This conversation was not found or is not available in your active workspace.</p>
            <Link href="/principal" className="theme-focus-ring mt-5 rounded-lg border theme-border px-4 py-2 text-sm font-medium theme-text">Start a new conversation</Link>
          </div>
        ) : messageState.loading ? (
          <div role="status" className="flex h-full min-h-72 items-center justify-center p-8 text-sm theme-muted">Loading conversation messagesâ€¦</div>
        ) : messageState.unavailable ? (
          <div role="alert" className="mx-auto flex h-full min-h-72 max-w-lg flex-col items-center justify-center p-8 text-center">
            <h1 className="text-xl font-semibold theme-text">Messages unavailable</h1>
            <p className="mt-2 text-sm theme-muted">The conversation remains available, but its messages could not be loaded.</p>
            <button type="button" onClick={messageState.retryLoad} className="theme-focus-ring mt-4 rounded-lg border theme-border px-4 py-2 text-sm font-medium theme-text">Retry messages</button>
          </div>
        ) : messageState.messages.length > 0 ? (
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
            {messageState.messages.map((message) => (
              <article key={message.id} className={message.role === 'USER' ? 'ml-auto max-w-[85%] rounded-2xl bg-[color:var(--brand-primary)] px-4 py-3 text-white' : 'mr-auto max-w-full rounded-2xl border theme-border bg-[color:var(--color-surface)] px-4 py-3'}>
                <p className="sr-only">{message.role === 'USER' ? 'You' : 'Scholaroscope assistant'}</p>
                {message.role === 'ASSISTANT' ? (
                  <AssistantResponseBlocks blocks={message.content_blocks} />
                ) : (
                  <div className="space-y-2 text-sm leading-6">
                    {message.content_blocks.map((block, index) => block.type === 'markdown' ? <p key={index} className="whitespace-pre-wrap">{block.text}</p> : null)}
                  </div>
                )}
              </article>
            ))}
            {messageState.sending ? <p role="status" className="text-sm theme-muted">Sending your question and waiting for governed intelligenceâ€¦</p> : null}
            <div ref={messagesEndRef} />
          </div>
        ) : isBlank ? (
          <div className="mx-auto flex h-full min-h-72 max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
            <div className="rounded-2xl bg-[color:var(--brand-primary)]/10 p-4 text-[color:var(--brand-primary)]">
              <MessageSquareText className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold theme-text sm:text-3xl">What would you like to know about?</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 theme-muted">Ask about attendance, learning progress, projects, assessments, or anything requiring your attention.</p>
          </div>
        ) : state.activeConversation ? (
          <div className="mx-auto flex h-full min-h-72 max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
            <History className="h-8 w-8 theme-subtle" />
            <h1 className="mt-4 max-w-full break-words text-xl font-semibold theme-text">{state.activeConversation.title}</h1>
            <p className="mt-2 text-sm theme-muted">This conversation has no stored messages yet.</p>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t theme-border bg-[color:var(--color-surface)] p-3 sm:p-4">
        <form onSubmit={(event) => void submit(event)} aria-label="Principal question composer" className="mx-auto max-w-3xl">
          <label htmlFor="principal-prompt" className="sr-only">Ask a school-level question</label>
          <div className="flex items-end gap-2 rounded-2xl border theme-border bg-[color:var(--color-background)] p-2">
            <textarea id="principal-prompt" rows={2} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={onComposerKeyDown} disabled={!canSend || messageState.sending} placeholder={canSend ? 'Ask about governed attendance information' : 'Switch to Principal oversight context to ask a question'} className="min-h-14 flex-1 resize-none bg-transparent px-3 py-2 text-sm theme-text outline-none disabled:cursor-not-allowed disabled:opacity-70" />
            <button type="submit" disabled={!canSend || !prompt.trim() || messageState.sending} aria-label="Send message" className="theme-focus-ring flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--brand-primary)] text-white disabled:cursor-not-allowed disabled:opacity-40">
              <Send aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          {!canSend ? <p className="mt-2 px-1 text-xs theme-muted">Questions are available only in your explicitly selected Principal oversight context. Your active context has not been changed.</p> : null}
          {messageState.retryableError ? (
            <div role="alert" className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[color:var(--color-danger)]/30 p-3 text-xs">
              <span className="text-[color:var(--color-danger)]">{messageState.retryableError}</span>
              <button type="button" onClick={() => void retry()} disabled={messageState.sending} className="theme-focus-ring rounded underline">Retry</button>
            </div>
          ) : null}
          {state.activeConversation && state.deleteErrorId === state.activeConversation.id ? <p role="alert" className="mt-2 px-1 text-xs text-[color:var(--color-danger)]">The conversation could not be deleted. It remains in your history; retry when ready.</p> : null}
        </form>
      </div>
    </section>
  );
}

export function PrincipalWorkspace() {
  const { activeOrg, activeOperatingContext } = useAuth();
  const params = useParams<{ conversationId?: string }>();
  const rawConversationId = params?.conversationId;
  const parsedConversationId = rawConversationId ? Number(rawConversationId) : null;
  const invalidConversationId = rawConversationId !== undefined
    && (!Number.isInteger(parsedConversationId) || (parsedConversationId ?? 0) <= 0);
  const conversationId = invalidConversationId ? null : parsedConversationId;
  const state = usePrincipalConversations(
    activeOrg?.id ?? null,
    conversationId,
    invalidConversationId,
  );
  const messageState = usePrincipalConversationMessages(
    activeOrg?.id ?? null,
    conversationId,
  );
  const academicYear = useCurrentAcademicYear();
  const term = useCurrentTerm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setDrawerOpen(false);
  }, [rawConversationId]);

  useEffect(() => {
    if (!activeOrg) router.replace('/dashboard');
  }, [activeOrg, router]);

  useEffect(() => {
    document.title = state.activeConversation?.title
      ? `${state.activeConversation.title} | Scholaroscope`
      : 'Principal Dashboard | Scholaroscope';
  }, [state.activeConversation?.title]);

  const sidebar = (
    <ConversationSidebar
      state={state}
      activeConversationId={conversationId}
      newConversationActive={rawConversationId === undefined}
      workspaceName={activeOrg?.name ?? 'Current workspace'}
      onNavigate={() => setDrawerOpen(false)}
    />
  );

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <aside className="hidden h-full min-h-0 w-72 shrink-0 border-r theme-border lg:block" aria-label="Conversation navigation">
        {sidebar}
      </aside>
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/45" onClick={() => setDrawerOpen(false)} aria-label="Close conversation history" />
          <aside className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] border-r theme-border shadow-2xl" aria-label="Conversation navigation">
            <button type="button" onClick={() => setDrawerOpen(false)} className="theme-focus-ring absolute right-2 top-2 z-10 rounded-lg p-2 theme-hover-surface" aria-label="Close conversation history panel"><X className="h-4 w-4" /></button>
            {sidebar}
          </aside>
        </div>
      ) : null}
      <ConversationCanvas
        state={state}
        messageState={messageState}
        isBlank={rawConversationId === undefined}
        canSend={activeOperatingContext === 'INSTITUTION_OVERSIGHT'}
        academicYearName={academicYear.currentYear?.name}
        termName={term.currentTerm?.name}
        contextUnavailable={Boolean(academicYear.error || term.error)}
        contextLoading={academicYear.loading || term.loading}
        onRetryContext={() => {
          void academicYear.refetch();
          void term.refetch();
        }}
        onOpenHistory={() => setDrawerOpen(true)}
        onConversationCreated={(createdConversationId) => {
          router.replace(`/principal/conversations/${createdConversationId}`);
        }}
      />
    </div>
  );
}

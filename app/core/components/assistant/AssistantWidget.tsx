'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  ArrowUpRight,
  Compass,
  Lightbulb,
  Mail,
  MessageCircle,
  Minus,
  MousePointerClick,
  RotateCcw,
  Send,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';

import { assistantAPI } from '@/app/core/api/assistant';
import { useAssistant } from '@/app/core/components/assistant/AssistantProvider';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { useAuth } from '@/app/context/AuthContext';
import type { Role } from '@/app/core/types/auth';
import type {
  AssistantAction,
  AssistantChatResponse,
  AssistantFeedbackCategory,
  AssistantResponseKind,
  AssistantSuggestion,
} from '@/app/core/types/assistant';

type AssistantWidgetMode = 'closed' | 'minimized' | 'open';

interface AssistantThreadItem {
  id: string;
  userMessage: string;
  response: AssistantChatResponse;
}

const QUICK_PROMPTS_BY_ROLE: Record<Role, string[]> = {
  INSTRUCTOR: [
    'What can I do here?',
    'Who are you?',
    'Help me schedule a lesson',
    'Help me take attendance',
  ],
  ADMIN: [
    'Help me set up school',
    'Help me add a class',
    'Help me assign a teacher',
    'Show school setup workflow',
  ],
  SUPERADMIN: [
    'Help me review organizations',
    'Help me review feedback',
    'Show platform workflow',
    'Who are you?',
  ],
};

const RESPONSE_KIND_META: Partial<
  Record<
    AssistantResponseKind,
    {
      label: string;
      variant: 'default' | 'blue' | 'green' | 'orange' | 'purple' | 'yellow';
    }
  >
> = {
  capability: { label: 'Capabilities', variant: 'green' },
  clarification: { label: 'Clarifying', variant: 'blue' },
  identity: { label: 'Guide', variant: 'purple' },
  page_help: { label: 'Page Help', variant: 'blue' },
  unsupported_feature: { label: 'Not Available Yet', variant: 'orange' },
  workflow: { label: 'Workflow', variant: 'purple' },
};

function actionKey(action: AssistantAction): string {
  return `${action.type}:${action.label}:${action.href ?? ''}:${action.target ?? ''}:${action.prompt ?? ''}`;
}

function dedupeActions(actions: AssistantAction[]): AssistantAction[] {
  const seen = new Set<string>();

  return actions.filter((action) => {
    const key = actionKey(action);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupePrompts(prompts: string[]): string[] {
  const seen = new Set<string>();

  return prompts.filter((prompt) => {
    if (!prompt || seen.has(prompt)) {
      return false;
    }
    seen.add(prompt);
    return true;
  });
}

function roleQuickPrompts(role: Role | null): string[] {
  if (!role) {
    return QUICK_PROMPTS_BY_ROLE.INSTRUCTOR;
  }

  return QUICK_PROMPTS_BY_ROLE[role];
}

function ActionButton({
  action,
  onClick,
}: {
  action: AssistantAction;
  onClick: (action: AssistantAction) => void;
}) {
  const iconMap: Record<AssistantAction['type'], LucideIcon> = {
    chat_prompt: Sparkles,
    external: ArrowUpRight,
    feedback: Mail,
    navigate: Compass,
    page_action: MousePointerClick,
  };

  const Icon = iconMap[action.type];

  const className = {
    chat_prompt:
      'rounded-full border theme-border theme-surface-muted px-3 py-1.5 text-xs font-medium theme-text theme-hover-surface',
    external:
      'rounded-lg px-1 py-1 text-sm font-medium text-[color:var(--color-primary)] transition-colors hover:underline',
    feedback:
      'rounded-lg border theme-border theme-surface-muted px-3 py-2 text-sm font-medium theme-text theme-hover-surface',
    navigate:
      'rounded-lg border theme-border theme-surface-muted px-3 py-2 text-sm font-medium theme-text theme-hover-surface',
    page_action:
      'rounded-lg bg-[color:var(--color-primary)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95',
  }[action.type];

  return (
    <button
      type="button"
      onClick={() => onClick(action)}
      className={`theme-focus-ring inline-flex items-center gap-2 ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{action.label}</span>
    </button>
  );
}

function SuggestionCard({
  suggestion,
  onDismiss,
  onAction,
}: {
  suggestion: AssistantSuggestion;
  onDismiss?: () => void;
  onAction: (action: AssistantAction) => void;
}) {
  const actions = dedupeActions(suggestion.actions);

  return (
    <div className="rounded-xl border theme-border theme-surface-elevated p-3 shadow-lg">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-warning)]" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="orange" size="sm">
              Suggested next step
            </Badge>
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="theme-focus-ring rounded p-1 theme-muted transition-colors hover:text-[color:var(--color-text)]"
                aria-label="Dismiss suggestion"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <p className="text-sm theme-text">{suggestion.message}</p>
          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <ActionButton
                  key={`${suggestion.id}:${actionKey(action)}`}
                  action={action}
                  onClick={onAction}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ConversationCard({
  item,
  onAction,
}: {
  item: AssistantThreadItem;
  onAction: (action: AssistantAction) => void;
}) {
  const actions = dedupeActions(item.response.actions ?? []);
  const responseKind = item.response.response_kind
    ? RESPONSE_KIND_META[item.response.response_kind]
    : null;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-[color:var(--color-primary)] px-3 py-2 text-sm text-white">
          {item.userMessage}
        </div>
      </div>

      <div
        className={`rounded-2xl border p-3 ${
          item.response.response_kind === 'unsupported_feature'
            ? 'border-orange-200 bg-orange-50'
            : 'theme-border theme-surface-elevated'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Compass className="h-4 w-4 text-[color:var(--color-primary)]" />
          <span className="text-sm font-medium theme-text">Guide</span>
          {responseKind ? (
            <Badge variant={responseKind.variant} size="sm">
              {responseKind.label}
            </Badge>
          ) : null}
          <Badge
            variant={
              item.response.confidence === 'high'
                ? 'green'
                : item.response.confidence === 'medium'
                  ? 'blue'
                  : 'default'
            }
            size="sm"
          >
            {item.response.confidence}
          </Badge>
        </div>
        <p className="mt-3 text-sm theme-text">{item.response.message}</p>
        {actions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <ActionButton
                key={`${item.id}:${actionKey(action)}`}
                action={action}
                onClick={onAction}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PendingConversation({ userMessage }: { userMessage: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-[color:var(--color-primary)] px-3 py-2 text-sm text-white">
          {userMessage}
        </div>
      </div>

      <div className="rounded-2xl border theme-border theme-surface-elevated p-3">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[color:var(--color-primary)]" />
          <span className="text-sm font-medium theme-text">Guide</span>
        </div>
        <p className="mt-3 text-sm theme-muted">Guide is thinking...</p>
      </div>
    </div>
  );
}

function EmptyState({
  pageTitle,
  quickPrompts,
  nextSafeAction,
  suggestion,
  onQuickAsk,
  onAction,
  onDismissSuggestion,
}: {
  pageTitle?: string;
  quickPrompts: string[];
  nextSafeAction?: AssistantAction;
  suggestion: AssistantSuggestion | null;
  onQuickAsk: (message: string) => void;
  onAction: (action: AssistantAction) => void;
  onDismissSuggestion: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border theme-border theme-surface-muted p-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[color:var(--color-primary)]" />
          <span className="text-sm font-medium theme-text">
            {pageTitle ? `Help for ${pageTitle}` : 'ScholaroScope Guide'}
          </span>
        </div>
        <p className="mt-2 text-sm theme-text">
          Hi, I&apos;m your ScholaroScope Guide. Ask me what this page does, what to do next, or
          how to complete a workflow.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onQuickAsk(prompt)}
              className="theme-focus-ring rounded-full border theme-border theme-surface-elevated px-3 py-1.5 text-xs font-medium theme-text theme-hover-surface"
            >
              {prompt}
            </button>
          ))}
        </div>

        {nextSafeAction ? (
          <div className="mt-4 rounded-xl border theme-border bg-white/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide theme-muted">Next safe action</p>
            <div className="mt-2">
              <ActionButton action={nextSafeAction} onClick={onAction} />
            </div>
          </div>
        ) : null}
      </div>

      {suggestion ? (
        <SuggestionCard
          suggestion={suggestion}
          onDismiss={onDismissSuggestion}
          onAction={onAction}
        />
      ) : null}
    </div>
  );
}

function FeedbackCategoryOption({
  label,
  description,
  icon: Icon,
  selected,
  onSelect,
}: {
  label: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        selected
          ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/8'
          : 'theme-border theme-surface-muted theme-hover-surface'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-primary)]" />
        <div>
          <div className="text-sm font-medium theme-text">{label}</div>
          <div className="mt-1 text-xs theme-muted">{description}</div>
        </div>
      </div>
    </button>
  );
}

export function AssistantWidget() {
  const { activeRole } = useAuth();
  const {
    activeSuggestion,
    buildChatPayload,
    buildFeedbackPayload,
    dismissSuggestion,
    executeAction,
    pageContext,
    suggestions,
    suggestionsLoading,
  } = useAssistant();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [mode, setMode] = useState<AssistantWidgetMode>('closed');
  const [message, setMessage] = useState('');
  const [thread, setThread] = useState<AssistantThreadItem[]>([]);
  const [pending, setPending] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<AssistantFeedbackCategory>('FEATURE_REQUEST');
  const [feedbackTitle, setFeedbackTitle] = useState('Feature request from assistant');
  const [feedbackDescription, setFeedbackDescription] = useState('');
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const mobileBottomOffsetStyle = useMemo(
    () => ({
      bottom: 'calc(env(safe-area-inset-bottom) + var(--assistant-widget-offset, 1rem))',
    }),
    []
  );

  const quickPrompts = useMemo(() => roleQuickPrompts(activeRole), [activeRole]);
  const hasPendingSuggestion = !suggestionsLoading && Boolean(activeSuggestion);
  const suggestionForPanel = useMemo(
    () => activeSuggestion ?? suggestions[0] ?? null,
    [activeSuggestion, suggestions]
  );

  useEffect(() => {
    if (mode !== 'open') {
      return;
    }

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [mode, pending]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });
  }, [chatError, feedbackMessage, feedbackOpen, pendingUserMessage, thread]);

  const openFeedbackForm = (seed?: {
    title?: string;
    description?: string;
    category?: AssistantFeedbackCategory;
  }) => {
    setMode('open');
    setFeedbackOpen(true);
    setFeedbackMessage(null);
    setFeedbackCategory(seed?.category ?? 'FEATURE_REQUEST');
    setFeedbackTitle(seed?.title ?? 'Feature request from assistant');
    setFeedbackDescription(seed?.description ?? lastUserMessage);
  };

  const handleAssistantAction = (action: AssistantAction) => {
    if (action.type === 'chat_prompt') {
      setMode('open');
      void sendMessage(action.prompt || action.label);
      return;
    }

    if (action.type === 'feedback') {
      openFeedbackForm({
        title: 'Feature request from assistant',
        description: lastUserMessage || feedbackDescription,
        category: 'FEATURE_REQUEST',
      });
      return;
    }

    executeAction(action);
  };

  const sendMessage = async (nextMessage: string) => {
    const trimmed = nextMessage.trim();
    if (!trimmed || pending) {
      return;
    }

    setMode('open');
    setPending(true);
    setPendingUserMessage(trimmed);
    setChatError(null);
    setFailedMessage(null);
    setLastUserMessage(trimmed);

    try {
      const response = await assistantAPI.chat(buildChatPayload(trimmed));
      setThread((current) => [
        ...current,
        {
          id: `${Date.now()}-${current.length}`,
          userMessage: trimmed,
          response: {
            ...response,
            actions: dedupeActions(response.actions ?? []),
            follow_up_prompts: dedupePrompts(response.follow_up_prompts ?? []),
          },
        },
      ]);
      if (response.unsupported) {
        setFeedbackDescription((current) => current || trimmed);
      }
      setMessage((current) => (current.trim() === trimmed ? '' : current));
    } catch (error) {
      setFailedMessage(trimmed);
      setChatError(error instanceof Error ? error.message : 'Could not reach the help assistant.');
    } finally {
      setPending(false);
      setPendingUserMessage(null);
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(message);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (pending) {
      return;
    }

    void sendMessage(message);
  };

  const handleFeedbackSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFeedbackPending(true);
    setFeedbackMessage(null);

    try {
      const response = await assistantAPI.submitFeedback(
        buildFeedbackPayload({
          title: feedbackTitle.trim(),
          description: feedbackDescription.trim(),
          category: feedbackCategory,
          userMessage: lastUserMessage,
        })
      );
      setFeedbackMessage(response.message);
      setFeedbackDescription('');
      setFeedbackOpen(false);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : 'Could not submit feedback.');
    } finally {
      setFeedbackPending(false);
    }
  };

  return (
    <>
      {mode !== 'open' ? (
        <div
          className="pointer-events-none fixed right-4 z-30 md:!bottom-6 md:right-6"
          style={mobileBottomOffsetStyle}
        >
          {mode === 'minimized' ? (
            <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border theme-border theme-surface-elevated px-2.5 py-2 shadow-lg sm:px-3">
              <button
                type="button"
                onClick={() => setMode('open')}
                className="theme-focus-ring inline-flex min-w-0 items-center gap-2 rounded-full text-sm font-medium theme-text"
                aria-label="Open ScholaroScope Guide"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Guide</span>
                {pageContext?.pageTitle ? (
                  <span className="hidden max-w-32 truncate text-xs theme-muted sm:inline">
                    {pageContext.pageTitle}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setMode('closed')}
                className="theme-focus-ring rounded-full p-1 theme-muted transition-colors hover:text-[color:var(--color-text)]"
                aria-label="Close guide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => setMode('open')}
              className="pointer-events-auto h-12 w-12 rounded-full px-0 py-0 shadow-lg sm:h-auto sm:w-auto sm:px-4 sm:py-3"
              aria-label="Open ScholaroScope Guide"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Guide</span>
              {hasPendingSuggestion ? (
                <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold sm:inline-flex">
                  New
                </span>
              ) : null}
            </Button>
          )}
        </div>
      ) : null}

      {mode === 'open' ? (
        <div
          className="pointer-events-none fixed inset-x-2 z-40 max-w-[calc(100vw-1rem)] md:inset-auto md:!bottom-6 md:right-6 md:w-[380px] md:max-w-[calc(100vw-2rem)]"
          style={mobileBottomOffsetStyle}
        >
          <Card className="pointer-events-auto theme-surface-elevated h-[75vh] max-h-[75vh] w-full overflow-hidden rounded-2xl border p-0 shadow-2xl md:h-[42rem] md:max-h-[42rem] md:w-[380px]">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-3 border-b theme-border px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-[color:var(--color-primary)]" />
                    <h2 className="truncate text-sm font-semibold theme-text">ScholaroScope Guide</h2>
                  </div>
                  <p className="mt-1 truncate text-xs theme-muted">
                    {pageContext?.pageTitle ?? 'Contextual help for this workspace'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMode('minimized')}
                    className="theme-focus-ring rounded-lg p-2 theme-hover-surface"
                    aria-label="Minimize guide"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('closed')}
                    className="theme-focus-ring rounded-lg p-2 theme-hover-surface"
                    aria-label="Close guide"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-4">
                  {feedbackMessage ? (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      {feedbackMessage}
                    </div>
                  ) : null}

                  {chatError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <div>{chatError}</div>
                      {failedMessage ? (
                        <button
                          type="button"
                          onClick={() => void sendMessage(failedMessage)}
                          className="theme-focus-ring mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {thread.length === 0 && !pendingUserMessage ? (
                    <EmptyState
                      pageTitle={pageContext?.pageTitle}
                      quickPrompts={quickPrompts}
                      nextSafeAction={pageContext?.nextSafeAction}
                      suggestion={suggestionForPanel}
                      onQuickAsk={(nextMessage) => {
                        void sendMessage(nextMessage);
                      }}
                      onAction={handleAssistantAction}
                      onDismissSuggestion={() => {
                        if (suggestionForPanel) {
                          dismissSuggestion(suggestionForPanel.id);
                        }
                      }}
                    />
                  ) : (
                    thread.map((item) => (
                      <ConversationCard
                        key={item.id}
                        item={item}
                        onAction={handleAssistantAction}
                      />
                    ))
                  )}

                  {pendingUserMessage ? <PendingConversation userMessage={pendingUserMessage} /> : null}

                  {feedbackOpen ? (
                    <div className="rounded-2xl border theme-border theme-surface-muted p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold theme-text">Submit feedback</h3>
                        <button
                          type="button"
                          onClick={() => setFeedbackOpen(false)}
                          className="theme-focus-ring rounded p-1 theme-muted transition-colors hover:text-[color:var(--color-text)]"
                          aria-label="Close feedback form"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <form onSubmit={handleFeedbackSubmit} className="mt-4 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FeedbackCategoryOption
                            label="Feature request"
                            description="Use this when ScholaroScope does not support the workflow yet."
                            icon={Lightbulb}
                            selected={feedbackCategory === 'FEATURE_REQUEST'}
                            onSelect={() => setFeedbackCategory('FEATURE_REQUEST')}
                          />
                          <FeedbackCategoryOption
                            label="Bug report"
                            description="Use this when something is broken or behaving incorrectly."
                            icon={Mail}
                            selected={feedbackCategory === 'BUG_REPORT'}
                            onSelect={() => setFeedbackCategory('BUG_REPORT')}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium theme-text">Title</label>
                          <input
                            value={feedbackTitle}
                            onChange={(event) => setFeedbackTitle(event.target.value)}
                            className="theme-input w-full rounded-lg px-3 py-2 text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium theme-text">Description</label>
                          <textarea
                            value={feedbackDescription}
                            onChange={(event) => setFeedbackDescription(event.target.value)}
                            className="theme-input w-full rounded-lg px-3 py-2 text-sm"
                            rows={4}
                            required
                          />
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFeedbackOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" size="sm" disabled={feedbackPending}>
                            {feedbackPending ? 'Submitting...' : 'Submit feedback'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className="border-t theme-border px-4 pt-3"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
              >
                <form onSubmit={handleSubmit} className="space-y-3">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    rows={3}
                    placeholder="Ask about this page or workflow"
                    className="theme-input w-full resize-none rounded-lg px-3 py-2 text-sm"
                    disabled={pending}
                    aria-label="Ask the ScholaroScope Guide a question"
                  />
                  <div className="flex items-center justify-end gap-3">
                    <Button type="submit" size="sm" disabled={pending || !message.trim()}>
                      <Send className="h-4 w-4" />
                      {pending ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

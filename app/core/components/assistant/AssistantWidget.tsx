'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  Compass,
  Lightbulb,
  Mail,
  MessageCircle,
  Send,
  X,
  type LucideIcon,
} from 'lucide-react';

import { assistantAPI } from '@/app/core/api/assistant';
import { useAssistant } from '@/app/core/components/assistant/AssistantProvider';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import type {
  AssistantAction,
  AssistantChatResponse,
  AssistantFeedbackCategory,
  AssistantSuggestion,
} from '@/app/core/types/assistant';

interface AssistantThreadItem {
  id: string;
  userMessage: string;
  response: AssistantChatResponse;
}

function ActionButton({
  action,
  onClick,
}: {
  action: AssistantAction;
  onClick: (action: AssistantAction) => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={action.type === 'feedback' ? 'secondary' : 'ghost'}
      onClick={() => onClick(action)}
      className="justify-start"
    >
      {action.label}
    </Button>
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
  return (
    <div className="rounded-lg border theme-border theme-surface-muted p-3">
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
          {suggestion.actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestion.actions.map((action) => (
                <ActionButton
                  key={`${suggestion.id}:${action.label}:${action.type}:${action.target ?? action.href ?? ''}`}
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
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-[color:var(--color-primary)] px-3 py-2 text-sm text-white">
          {item.userMessage}
        </div>
      </div>

      <div className="rounded-lg border theme-border theme-surface-elevated p-3">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[color:var(--color-primary)]" />
          <span className="text-sm font-medium theme-text">Guide</span>
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
        {item.response.actions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.response.actions.map((action) => (
              <ActionButton
                key={`${item.id}:${action.label}:${action.type}:${action.target ?? action.href ?? ''}`}
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

function EmptyState({
  pageTitle,
  suggestion,
  onQuickAsk,
  onAction,
  onDismissSuggestion,
}: {
  pageTitle?: string;
  suggestion: AssistantSuggestion | null;
  onQuickAsk: (message: string) => void;
  onAction: (action: AssistantAction) => void;
  onDismissSuggestion: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border theme-border theme-surface-muted p-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[color:var(--color-primary)]" />
          <span className="text-sm font-medium theme-text">
            {pageTitle ? `Help for ${pageTitle}` : 'Current page help'}
          </span>
        </div>
        <p className="mt-2 text-sm theme-muted">
          Ask about the current workflow, the next safe step, or something ScholaroScope does not support yet.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => onQuickAsk('What does this page do?')}>
            Explain this page
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onQuickAsk('What should I do next?')}>
            Next step
          </Button>
        </div>
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
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
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

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [thread, setThread] = useState<AssistantThreadItem[]>([]);
  const [pending, setPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<AssistantFeedbackCategory>('FEATURE_REQUEST');
  const [feedbackTitle, setFeedbackTitle] = useState('Feature request from assistant');
  const [feedbackDescription, setFeedbackDescription] = useState('');
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState('');

  const canShowHint = !isOpen && !suggestionsLoading && Boolean(activeSuggestion);
  const suggestionForPanel = useMemo(
    () => activeSuggestion ?? suggestions[0] ?? null,
    [activeSuggestion, suggestions]
  );

  const openFeedbackForm = (seed?: { title?: string; description?: string; category?: AssistantFeedbackCategory }) => {
    setFeedbackOpen(true);
    setFeedbackMessage(null);
    setFeedbackCategory(seed?.category ?? 'FEATURE_REQUEST');
    setFeedbackTitle(seed?.title ?? 'Feature request from assistant');
    setFeedbackDescription(seed?.description ?? '');
  };

  const handleAssistantAction = (action: AssistantAction) => {
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
    if (!trimmed) {
      return;
    }

    setPending(true);
    setChatError(null);
    setLastUserMessage(trimmed);

    try {
      const response = await assistantAPI.chat(buildChatPayload(trimmed));
      setThread((current) => [
        ...current,
        {
          id: `${Date.now()}-${current.length}`,
          userMessage: trimmed,
          response,
        },
      ]);
      if (response.unsupported) {
        setFeedbackDescription(trimmed);
      }
      setMessage('');
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Could not reach the help assistant.');
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(message);
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
      {canShowHint && activeSuggestion ? (
        <div className="fixed bottom-20 right-4 z-40 w-[min(20rem,calc(100vw-2rem))] md:bottom-24 md:right-6">
          <SuggestionCard
            suggestion={activeSuggestion}
            onDismiss={() => dismissSuggestion(activeSuggestion.id)}
            onAction={handleAssistantAction}
          />
        </div>
      ) : null}

      <div className="fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6">
        <Button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="rounded-full px-4 py-3 shadow-lg"
        >
          <MessageCircle className="h-4 w-4" />
          Guide
        </Button>
      </div>

      {isOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-50 md:inset-auto md:bottom-6 md:right-6 md:w-[min(26rem,calc(100vw-2rem))]">
          <Card className="theme-surface-elevated h-[78vh] rounded-b-none border shadow-2xl md:h-[42rem] md:rounded-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-3 border-b theme-border px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-[color:var(--color-primary)]" />
                    <h2 className="truncate text-sm font-semibold theme-text">ScholaroScope Guide</h2>
                  </div>
                  <p className="mt-1 truncate text-xs theme-muted">
                    {pageContext?.pageTitle ?? 'Authenticated dashboard help'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="theme-focus-ring rounded-lg p-2 theme-hover-surface"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-4">
                  {feedbackMessage ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      {feedbackMessage}
                    </div>
                  ) : null}

                  {chatError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {chatError}
                    </div>
                  ) : null}

                  {thread.length === 0 ? (
                    <EmptyState
                      pageTitle={pageContext?.pageTitle}
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

                  {feedbackOpen ? (
                    <div className="rounded-lg border theme-border theme-surface-muted p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold theme-text">Submit feedback</h3>
                        <button
                          type="button"
                          onClick={() => setFeedbackOpen(false)}
                          className="theme-focus-ring rounded p-1 theme-muted transition-colors hover:text-[color:var(--color-text)]"
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFeedbackForm()}
                      className="theme-focus-ring flex w-full items-center justify-center gap-2 rounded-lg border theme-border px-3 py-2 text-sm theme-text theme-hover-surface"
                    >
                      <Mail className="h-4 w-4" />
                      Submit feedback
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t theme-border px-4 py-3">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    placeholder="Ask about this page or workflow"
                    className="theme-input w-full resize-none rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => openFeedbackForm()}
                      className="theme-focus-ring inline-flex items-center gap-2 text-sm theme-muted transition-colors hover:text-[color:var(--color-text)]"
                    >
                      <Mail className="h-4 w-4" />
                      Feedback
                    </button>
                    <Button type="submit" size="sm" disabled={pending || !message.trim()}>
                      <Send className="h-4 w-4" />
                      Send
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

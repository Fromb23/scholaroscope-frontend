'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { assistantAPI } from '@/app/core/api/assistant';
import {
  buildAssistantPageContextSignature,
  mergeAssistantVisibleActions,
  normalizeAssistantAction,
} from '@/app/core/components/assistant/assistantContextUtils';
import { useAuth } from '@/app/context/AuthContext';
import type { Role } from '@/app/core/types/auth';
import type {
  AssistantAction,
  AssistantChatRequest,
  AssistantFeedbackPayload,
  AssistantPageActionRegistration,
  AssistantPageContext,
  AssistantPageContextRegistration,
  AssistantSuggestRequest,
  AssistantSuggestion,
} from '@/app/core/types/assistant';

const DISMISSED_SUGGESTIONS_STORAGE_KEY = 'scholaroscope.assistant.dismissedSuggestions.v1';

interface AssistantContextValue {
  pageContext: AssistantPageContext | null;
  activeSuggestion: AssistantSuggestion | null;
  suggestions: AssistantSuggestion[];
  suggestionsLoading: boolean;
  registerPageContext: (context: AssistantPageContextRegistration | null) => void;
  dismissSuggestion: (suggestionId: string) => void;
  executeAction: (action: AssistantAction) => boolean;
  buildChatPayload: (message: string) => {
    message: string;
    path: string;
    page_key?: string;
    role?: Role | null;
    context?: {
      page_title?: string;
      state?: Record<string, unknown>;
      visible_actions?: AssistantAction[];
    };
  };
  buildFeedbackPayload: (
    payload: Omit<AssistantFeedbackPayload, 'path' | 'role' | 'context'>
      & { userMessage?: string }
  ) => AssistantFeedbackPayload;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

function readDismissedSuggestions(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const stored = window.localStorage.getItem(DISMISSED_SUGGESTIONS_STORAGE_KEY);
    if (!stored) {
      return new Set<string>();
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? new Set(parsed.filter((item) => typeof item === 'string')) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function persistDismissedSuggestions(ids: Set<string>): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    DISMISSED_SUGGESTIONS_STORAGE_KEY,
    JSON.stringify(Array.from(ids))
  );
}

function buildActionHandlerMap(
  visibleActions: AssistantPageActionRegistration[] | undefined,
  nextSafeAction?: AssistantPageActionRegistration
): Record<string, () => void> {
  const handlers: Record<string, () => void> = {};

  [...(visibleActions ?? []), ...(nextSafeAction ? [nextSafeAction] : [])].forEach((action) => {
    if (action.type !== 'page_action' || !action.target || !action.handler) {
      return;
    }
    handlers[action.target] = action.handler;
  });

  return handlers;
}

function isPageLoading(state: Record<string, unknown> | undefined): boolean {
  return state?.is_loading === true || state?.isLoading === true;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeRole } = useAuth();

  const [pageContext, setPageContext] = useState<AssistantPageContext | null>(null);
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(
    () => readDismissedSuggestions()
  );

  const actionHandlersRef = useRef<Record<string, () => void>>({});
  const pageContextSignatureRef = useRef<string>('');
  const lastSuggestSignatureRef = useRef<string>('');
  const registerDebugRef = useRef<{
    count: number;
    signature: string;
    startedAt: number;
  }>({
    count: 0,
    signature: '',
    startedAt: 0,
  });

  const registerPageContext = useCallback((context: AssistantPageContextRegistration | null) => {
    if (!context) {
      actionHandlersRef.current = {};
      pageContextSignatureRef.current = '';
      setPageContext(null);
      return;
    }

    const nextSignature = buildAssistantPageContextSignature(context);
    const now = Date.now();

    if (process.env.NODE_ENV !== 'production') {
      if (
        registerDebugRef.current.signature !== nextSignature
        || now - registerDebugRef.current.startedAt > 1000
      ) {
        registerDebugRef.current = {
          count: 1,
          signature: nextSignature,
          startedAt: now,
        };
      } else {
        registerDebugRef.current.count += 1;
        if (registerDebugRef.current.count === 6) {
          console.warn(
            'Assistant page context is being registered too frequently. Memoize assistantContext or stabilize page action handlers.'
          );
        }
      }
    }

    actionHandlersRef.current = buildActionHandlerMap(
      context.visibleActions,
      context.nextSafeAction
    );

    if (nextSignature === pageContextSignatureRef.current) {
      return;
    }

    pageContextSignatureRef.current = nextSignature;
    const normalizedVisibleActions = mergeAssistantVisibleActions(
      context.visibleActions,
      context.nextSafeAction
    );

    setPageContext({
      pageKey: context.pageKey,
      pageTitle: context.pageTitle,
      state: context.state ?? {},
      visibleActions: normalizedVisibleActions,
      nextSafeAction: context.nextSafeAction
        ? normalizeAssistantAction(context.nextSafeAction)
        : undefined,
      workflowStep: context.workflowStep,
      emptyStateReason: context.emptyStateReason,
    });
  }, []);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setDismissedSuggestionIds((current) => {
      const next = new Set(current);
      next.add(suggestionId);
      persistDismissedSuggestions(next);
      return next;
    });
  }, []);

  const executeAction = useCallback((action: AssistantAction): boolean => {
    if (action.type === 'navigate' && action.href) {
      router.push(action.href);
      return true;
    }

    if (action.type === 'external' && action.href && typeof window !== 'undefined') {
      window.location.href = action.href;
      return true;
    }

    if (action.type === 'page_action' && action.target) {
      const handler = actionHandlersRef.current[action.target];
      if (!handler) {
        return false;
      }
      handler();
      return true;
    }

    return false;
  }, [router]);

  const buildChatPayload = useCallback((message: string): AssistantChatRequest => ({
    message,
    path: pathname || '/dashboard',
    page_key: pageContext?.pageKey,
    role: activeRole,
    context: {
      page_title: pageContext?.pageTitle,
      state: {
        ...(pageContext?.state ?? {}),
        ...(pageContext?.nextSafeAction ? { next_safe_action: pageContext.nextSafeAction } : {}),
        ...(pageContext?.workflowStep ? { workflow_step: pageContext.workflowStep } : {}),
        ...(pageContext?.emptyStateReason ? { empty_state_reason: pageContext.emptyStateReason } : {}),
      },
      visible_actions: pageContext?.visibleActions ?? [],
    },
  }), [activeRole, pageContext, pathname]);

  const buildFeedbackPayload = useCallback((
    payload: Omit<AssistantFeedbackPayload, 'path' | 'role' | 'context'> & { userMessage?: string }
  ): AssistantFeedbackPayload => ({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    path: pathname || '/dashboard',
    role: activeRole,
    context: {
      source: 'assistant',
      page_key: pageContext?.pageKey,
      user_message: payload.userMessage ?? '',
    },
  }), [activeRole, pageContext?.pageKey, pathname]);

  const activeSuggestion = useMemo(() => {
    if (isPageLoading(pageContext?.state)) {
      return null;
    }

    return suggestions.find(
      (suggestion) =>
        suggestion.priority === 'high' && !dismissedSuggestionIds.has(suggestion.id)
    ) ?? null;
  }, [dismissedSuggestionIds, pageContext?.state, suggestions]);

  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !dismissedSuggestionIds.has(suggestion.id)),
    [dismissedSuggestionIds, suggestions]
  );

  const suggestionPayload = useMemo<AssistantSuggestRequest | null>(() => {
    if (!activeRole || !pageContext || isPageLoading(pageContext.state)) {
      return null;
    }

    return {
      path: pathname || '/dashboard',
      page_key: pageContext.pageKey,
      role: activeRole,
      context: {
        page_title: pageContext.pageTitle,
        state: {
          ...(pageContext.state ?? {}),
          ...(pageContext.nextSafeAction ? { next_safe_action: pageContext.nextSafeAction } : {}),
          ...(pageContext.workflowStep ? { workflow_step: pageContext.workflowStep } : {}),
          ...(pageContext.emptyStateReason ? { empty_state_reason: pageContext.emptyStateReason } : {}),
        },
        visible_actions: pageContext.visibleActions ?? [],
      },
    };
  }, [activeRole, pageContext, pathname]);
  const suggestionSignature = useMemo(
    () => (suggestionPayload ? JSON.stringify(suggestionPayload) : ''),
    [suggestionPayload]
  );

  useEffect(() => {
    if (!activeRole) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      lastSuggestSignatureRef.current = '';
      return;
    }

    if (!pageContext) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      lastSuggestSignatureRef.current = '';
      return;
    }

    if (!suggestionPayload) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    if (suggestionSignature === lastSuggestSignatureRef.current) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      lastSuggestSignatureRef.current = suggestionSignature;
      setSuggestionsLoading(true);
      assistantAPI
        .suggest(suggestionPayload)
        .then((response) => {
          if (cancelled) {
            return;
          }
          setSuggestions(response.suggestions ?? []);
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setSuggestions([]);
        })
        .finally(() => {
          if (cancelled) {
            return;
          }
          setSuggestionsLoading(false);
        });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeRole, pageContext, suggestionPayload, suggestionSignature]);

  const value = useMemo<AssistantContextValue>(() => ({
    pageContext,
    activeSuggestion,
    suggestions: visibleSuggestions,
    suggestionsLoading,
    registerPageContext,
    dismissSuggestion,
    executeAction,
    buildChatPayload,
    buildFeedbackPayload,
  }), [
    activeSuggestion,
    buildChatPayload,
    buildFeedbackPayload,
    dismissSuggestion,
    executeAction,
    pageContext,
    registerPageContext,
    suggestionsLoading,
    visibleSuggestions,
  ]);

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider.');
  }
  return context;
}

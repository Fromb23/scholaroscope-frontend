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
import { useAuth } from '@/app/context/AuthContext';
import type { Role } from '@/app/core/types/auth';
import type {
  AssistantAction,
  AssistantChatRequest,
  AssistantFeedbackPayload,
  AssistantPageActionRegistration,
  AssistantPageContext,
  AssistantPageContextRegistration,
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

function normalizeVisibleActions(
  visibleActions: AssistantPageActionRegistration[] | undefined
): AssistantAction[] {
  return (visibleActions ?? []).map((action) => ({
    label: action.label,
    type: action.type,
    href: action.href,
    target: action.target,
  }));
}

function buildActionHandlerMap(
  visibleActions: AssistantPageActionRegistration[] | undefined
): Record<string, () => void> {
  const handlers: Record<string, () => void> = {};

  (visibleActions ?? []).forEach((action) => {
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
  const [actionHandlers, setActionHandlers] = useState<Record<string, () => void>>({});
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(
    () => readDismissedSuggestions()
  );

  const lastSuggestSignatureRef = useRef<string>('');

  const registerPageContext = useCallback((context: AssistantPageContextRegistration | null) => {
    if (!context) {
      setPageContext(null);
      setActionHandlers({});
      return;
    }

    setPageContext({
      pageKey: context.pageKey,
      pageTitle: context.pageTitle,
      state: context.state ?? {},
      visibleActions: normalizeVisibleActions(context.visibleActions),
    });
    setActionHandlers(buildActionHandlerMap(context.visibleActions));
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
      const handler = actionHandlers[action.target];
      if (!handler) {
        return false;
      }
      handler();
      return true;
    }

    return false;
  }, [actionHandlers, router]);

  const buildChatPayload = useCallback((message: string): AssistantChatRequest => ({
    message,
    path: pathname || '/dashboard',
    page_key: pageContext?.pageKey,
    role: activeRole,
    context: {
      page_title: pageContext?.pageTitle,
      state: pageContext?.state ?? {},
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

  useEffect(() => {
    if (!activeRole) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    if (!pageContext) {
      setSuggestions([]);
      return;
    }

    if (isPageLoading(pageContext.state)) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const payload = {
      path: pathname || '/dashboard',
      page_key: pageContext.pageKey,
      role: activeRole,
      context: {
        page_title: pageContext.pageTitle,
        state: pageContext.state ?? {},
        visible_actions: pageContext.visibleActions ?? [],
      },
    };
    const signature = JSON.stringify(payload);

    if (signature === lastSuggestSignatureRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuggestionsLoading(true);
      assistantAPI
        .suggest(payload)
        .then((response) => {
          lastSuggestSignatureRef.current = signature;
          setSuggestions(response.suggestions ?? []);
        })
        .catch(() => {
          lastSuggestSignatureRef.current = signature;
          setSuggestions([]);
        })
        .finally(() => {
          setSuggestionsLoading(false);
        });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [activeRole, pageContext, pathname]);

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

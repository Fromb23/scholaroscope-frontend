'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { assistantAPI } from '@/app/core/api/assistant';
import { isStructuredAssistantMarkdown } from '@/app/core/components/assistant/AssistantProgressiveText';
import {
  type AssistantRequestState,
  useAssistantRequestState,
} from '@/app/core/components/assistant/useAssistantRequestState';
import type {
  AssistantConversation,
  AssistantExecutionStage,
  AssistantMessage,
  AssistantRun,
  AssistantRunDiagnostics,
  AssistantTurn,
} from '@/app/core/types/assistant';

export interface PrincipalConversationMessageState {
  turns: AssistantTurn[];
  legacyMessages: AssistantMessage[];
  loading: boolean;
  refreshing: boolean;
  sending: boolean;
  requestState: AssistantRequestState;
  executionStage: AssistantExecutionStage | null;
  longRunning: boolean;
  diagnostics?: AssistantRunDiagnostics;
  progressiveMessageIds: ReadonlySet<number>;
  unavailable: boolean;
  submitMessage: (message: string) => Promise<number | null>;
  retryTurn: (turnId: number, runId: number) => Promise<number | null>;
  retryLoad: () => void;
  completeProgressiveMessage: (messageId: number) => void;
}

type PollToken = { generation: number; token: symbol };
type PollTimer = { timer: ReturnType<typeof setTimeout>; resolve: () => void };

const isActive = (run: AssistantRun | null) => Boolean(
  run && (run.status === 'PENDING' || run.status === 'RUNNING'),
);

const isTerminal = (run: AssistantRun) => (
  run.status === 'COMPLETED'
  || run.status === 'SUCCEEDED'
  || run.status === 'FAILED'
  || run.status === 'UNSUPPORTED'
);

const scopeKey = (organizationId: number, conversationId: number) => (
  `${organizationId}:${conversationId}`
);

export function usePrincipalConversationMessages(
  organizationId: number | null,
  conversationId: number | null,
  onConversationUpdated?: (conversation: AssistantConversation) => void,
): PrincipalConversationMessageState {
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [legacyMessages, setLegacyMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(organizationId && conversationId));
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [executionStage, setExecutionStage] = useState<AssistantExecutionStage | null>(null);
  const [longRunning, setLongRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AssistantRunDiagnostics>();
  const [progressiveMessageIds, setProgressiveMessageIds] = useState<Set<number>>(new Set());
  const {
    requestState,
    beginRequest,
    markThinking,
    markTypewriting,
    markComplete,
    markRequestFailed,
    resetRequestState,
  } = useAssistantRequestState();

  const generationRef = useRef(0);
  const mutationRevisionRef = useRef(0);
  const optimisticIdRef = useRef(-1);
  const createdConversationRef = useRef<number | null>(null);
  const handoffScopeRef = useRef<string | null>(null);
  const currentOrganizationRef = useRef(organizationId);
  const currentConversationRef = useRef(conversationId);
  const previousScopeRef = useRef({ organizationId, conversationId });
  const onConversationUpdatedRef = useRef(onConversationUpdated);
  const turnsRef = useRef(turns);
  const legacyMessagesRef = useRef(legacyMessages);
  const sendingRef = useRef(sending);
  const historyControllerRef = useRef<AbortController | null>(null);
  const historyRequestRef = useRef(0);
  const operationControllersRef = useRef<Set<AbortController>>(new Set());
  const pollControllersRef = useRef<Map<number, AbortController>>(new Map());
  const pollingRef = useRef<Map<number, PollToken>>(new Map());
  const pollTimersRef = useRef<Map<string, PollTimer>>(new Map());
  const titleTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const animatingMessageIdsRef = useRef<Set<number>>(new Set());
  const revealedMessageIdsRef = useRef<Set<number>>(new Set());

  currentOrganizationRef.current = organizationId;
  currentConversationRef.current = conversationId;
  onConversationUpdatedRef.current = onConversationUpdated;
  turnsRef.current = turns;
  legacyMessagesRef.current = legacyMessages;
  sendingRef.current = sending;

  const cancelActive = useCallback(() => {
    generationRef.current += 1;
    historyRequestRef.current += 1;
    historyControllerRef.current?.abort();
    historyControllerRef.current = null;
    operationControllersRef.current.forEach((controller) => controller.abort());
    operationControllersRef.current.clear();
    pollControllersRef.current.forEach((controller) => controller.abort());
    pollControllersRef.current.clear();
    pollTimersRef.current.forEach(({ timer, resolve }) => {
      clearTimeout(timer);
      resolve();
    });
    pollTimersRef.current.clear();
    pollingRef.current.clear();
    titleTimersRef.current.forEach((timer) => clearTimeout(timer));
    titleTimersRef.current.clear();
    sendingRef.current = false;
  }, []);

  useEffect(() => () => cancelActive(), [cancelActive]);

  useEffect(() => {
    const previous = previousScopeRef.current;
    previousScopeRef.current = { organizationId, conversationId };
    if (
      previous.organizationId === organizationId
      && previous.conversationId === conversationId
    ) return;

    const isAcceptedMessageHandoff = (
      previous.organizationId === organizationId
      && conversationId !== null
      && createdConversationRef.current === conversationId
    );
    if (isAcceptedMessageHandoff) {
      createdConversationRef.current = null;
      handoffScopeRef.current = organizationId ? scopeKey(organizationId, conversationId) : null;
      return;
    }

    cancelActive();
    mutationRevisionRef.current = 0;
    createdConversationRef.current = null;
    handoffScopeRef.current = null;
    setTurns([]);
    setLegacyMessages([]);
    setLoading(Boolean(organizationId && conversationId));
    setRefreshing(false);
    setUnavailable(false);
    setSending(false);
    setDiagnostics(undefined);
    setProgressiveMessageIds(new Set());
    animatingMessageIdsRef.current.clear();
    revealedMessageIdsRef.current.clear();
    setLongRunning(false);
    setExecutionStage(null);
    resetRequestState();
  }, [cancelActive, conversationId, organizationId, resetRequestState]);

  const scheduleAuthoritativeTitleRefresh = useCallback((generation: number, id: number) => {
    [300, 1_200].forEach((delay) => {
      const timer = setTimeout(() => {
        titleTimersRef.current.delete(timer);
        if (generation !== generationRef.current) return;
        const controller = new AbortController();
        operationControllersRef.current.add(controller);
        assistantAPI.getConversation(id, controller.signal).then((conversation) => {
          if (generation === generationRef.current && !controller.signal.aborted) {
            onConversationUpdatedRef.current?.(conversation);
          }
        }).catch(() => undefined).finally(() => {
          operationControllersRef.current.delete(controller);
        });
      }, delay);
      titleTimersRef.current.add(timer);
    });
  }, []);

  const completeRun = useCallback((turnId: number, run: AssistantRun, generation: number) => {
    if (generation !== generationRef.current) return;
    mutationRevisionRef.current += 1;
    setExecutionStage(run.execution_stage);
    setDiagnostics(run.diagnostics);
    setTurns((current) => current.map((turn) => turn.id === turnId ? {
      ...turn,
      current_run: run,
      current_response: run.assistant_message,
      retry_allowed: run.status === 'FAILED' && run.retryable,
      retry_target_run_id: run.status === 'FAILED' && run.retryable ? run.id : null,
      attempts: turn.attempts.some((attempt) => attempt.id === run.id)
        ? turn.attempts.map((attempt) => attempt.id === run.id ? {
            ...attempt,
            status: run.status,
            execution_stage: run.execution_stage,
            retryable: run.retryable,
            response_message_id: run.assistant_message?.id ?? null,
          } : attempt)
        : turn.attempts,
    } : turn));
    if (run.assistant_message) {
      const progressive = run.assistant_message.content_blocks.some(
        (block) => block.type === 'markdown' && !isStructuredAssistantMarkdown(block.text),
      );
      if (progressive) {
        const messageId = run.assistant_message.id;
        if (
          !revealedMessageIdsRef.current.has(messageId)
          && !animatingMessageIdsRef.current.has(messageId)
        ) {
          animatingMessageIdsRef.current.add(messageId);
          setProgressiveMessageIds((current) => new Set(current).add(messageId));
          markTypewriting();
        }
      } else {
        markComplete();
      }
    }
    if (run.status === 'FAILED') markRequestFailed();
    sendingRef.current = false;
    setSending(false);
    setLongRunning(false);
    const activeConversationId = currentConversationRef.current;
    if (activeConversationId !== null) {
      scheduleAuthoritativeTitleRefresh(generation, activeConversationId);
    }
  }, [markComplete, markRequestFailed, markTypewriting, scheduleAuthoritativeTitleRefresh]);

  const waitForNextPoll = useCallback((runId: number, generation: number, delay: number) => (
    new Promise<void>((resolve) => {
      const key = `${generation}:${runId}`;
      const timer = setTimeout(() => {
        pollTimersRef.current.delete(key);
        resolve();
      }, delay);
      pollTimersRef.current.set(key, { timer, resolve });
    })
  ), []);

  const pollRun = useCallback(async (turnId: number, runId: number, generation: number) => {
    const existing = pollingRef.current.get(runId);
    if (existing?.generation === generation) return;
    const pollToken = { generation, token: Symbol(`assistant-run-${runId}`) };
    pollingRef.current.set(runId, pollToken);
    const started = Date.now();
    let failures = 0;
    try {
      while (generation === generationRef.current) {
        const controller = new AbortController();
        pollControllersRef.current.set(runId, controller);
        try {
          const run = await assistantAPI.getRun(runId, controller.signal);
          if (controller.signal.aborted || generation !== generationRef.current) return;
          failures = 0;
          mutationRevisionRef.current += 1;
          setExecutionStage(run.execution_stage);
          setDiagnostics(run.diagnostics);
          setLongRunning(Date.now() - started >= 25_000);
          setTurns((current) => current.map((turn) => turn.id === turnId
            ? { ...turn, current_run: run, retry_allowed: false, retry_target_run_id: null }
            : turn));
          if (isTerminal(run)) {
            completeRun(turnId, run, generation);
            return;
          }
        } catch {
          if (controller.signal.aborted || generation !== generationRef.current) return;
          failures += 1;
          if (failures >= 5) {
            sendingRef.current = false;
            setSending(false);
            markRequestFailed();
            return;
          }
        } finally {
          if (pollControllersRef.current.get(runId) === controller) {
            pollControllersRef.current.delete(runId);
          }
        }
        await waitForNextPoll(runId, generation, Math.min(4_000, 750 * 2 ** failures));
      }
    } finally {
      const current = pollingRef.current.get(runId);
      if (current?.token === pollToken.token) pollingRef.current.delete(runId);
      const key = `${generation}:${runId}`;
      const pendingTimer = pollTimersRef.current.get(key);
      if (pendingTimer) {
        clearTimeout(pendingTimer.timer);
        pollTimersRef.current.delete(key);
      }
    }
  }, [completeRun, markRequestFailed, waitForNextPoll]);

  const observeTurn = useCallback((turn: AssistantTurn, generation: number) => {
    if (!turn.current_run) return;
    if (isActive(turn.current_run)) {
      void pollRun(turn.id, turn.current_run.id, generation);
    } else if (isTerminal(turn.current_run)) {
      completeRun(turn.id, turn.current_run, generation);
    }
  }, [completeRun, pollRun]);

  useEffect(() => {
    if (!organizationId || conversationId === null) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const activeScope = scopeKey(organizationId, conversationId);
    if (handoffScopeRef.current === activeScope) {
      handoffScopeRef.current = null;
      return;
    }

    const controller = new AbortController();
    historyControllerRef.current?.abort();
    historyControllerRef.current = controller;
    const requestId = ++historyRequestRef.current;
    const generation = generationRef.current;
    const mutationRevision = mutationRevisionRef.current;
    const hasUsableHistory = turnsRef.current.length > 0 || legacyMessagesRef.current.length > 0;
    setLoading(!hasUsableHistory);
    setRefreshing(hasUsableHistory);
    if (!hasUsableHistory) setUnavailable(false);

    assistantAPI.listConversationTurns(conversationId, controller.signal)
      .then((history) => {
        if (
          controller.signal.aborted
          || requestId !== historyRequestRef.current
          || generation !== generationRef.current
          || mutationRevision !== mutationRevisionRef.current
          || currentOrganizationRef.current !== organizationId
          || currentConversationRef.current !== conversationId
        ) return;
        setTurns(history.turns);
        setLegacyMessages(history.legacy_unlinked_messages);
        history.turns.forEach((turn) => {
          if (turn.current_response && !isActive(turn.current_run)) {
            revealedMessageIdsRef.current.add(turn.current_response.id);
          }
        });
        setUnavailable(false);
        history.turns
          .filter((turn) => isActive(turn.current_run))
          .forEach((turn) => observeTurn(turn, generation));
      })
      .catch(() => {
        if (
          !controller.signal.aborted
          && requestId === historyRequestRef.current
          && generation === generationRef.current
          && currentOrganizationRef.current === organizationId
          && currentConversationRef.current === conversationId
          && !hasUsableHistory
        ) setUnavailable(true);
      })
      .finally(() => {
        if (
          !controller.signal.aborted
          && requestId === historyRequestRef.current
          && generation === generationRef.current
          && currentOrganizationRef.current === organizationId
          && currentConversationRef.current === conversationId
        ) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => controller.abort();
  }, [conversationId, loadAttempt, observeTurn, organizationId]);

  const submitMessage = useCallback(async (raw: string) => {
    const text = raw.trim();
    const activeOrganizationId = currentOrganizationRef.current;
    if (!text || !activeOrganizationId || sendingRef.current) return null;
    const activeConversationId = currentConversationRef.current;
    const generation = generationRef.current;
    const clientRequestId = crypto.randomUUID();
    const optimisticId = optimisticIdRef.current--;
    const controller = new AbortController();
    operationControllersRef.current.add(controller);
    mutationRevisionRef.current += 1;
    setTurns((current) => [...current, {
      id: optimisticId,
      user_message: {
        id: optimisticId,
        role: 'USER',
        client_request_id: clientRequestId,
        created_at: new Date().toISOString(),
        content_blocks: [{ type: 'markdown', text }],
      },
      current_run: null,
      current_response: null,
      retry_allowed: false,
      retry_target_run_id: null,
      attempts: [],
    }]);
    sendingRef.current = true;
    setSending(true);
    setDiagnostics(undefined);
    beginRequest();
    markThinking();
    try {
      const response = activeConversationId === null
        ? await assistantAPI.createConversationMessage(
            { message: text, client_request_id: clientRequestId },
            controller.signal,
          )
        : await assistantAPI.appendConversationMessage(
            activeConversationId,
            { message: text, client_request_id: clientRequestId },
            controller.signal,
          );
      if (controller.signal.aborted || generation !== generationRef.current) return null;
      setTurns((current) => {
        const withoutOptimistic = current.filter((turn) => turn.id !== optimisticId);
        return withoutOptimistic.some((turn) => turn.id === response.turn.id)
          ? withoutOptimistic.map((turn) => turn.id === response.turn.id ? response.turn : turn)
          : [...withoutOptimistic, response.turn];
      });
      onConversationUpdatedRef.current?.(response.conversation);
      if (activeConversationId === null) createdConversationRef.current = response.conversation.id;
      setExecutionStage(response.execution_stage);
      observeTurn(response.turn, generation);
      return response.conversation.id;
    } catch {
      if (!controller.signal.aborted && generation === generationRef.current) {
        sendingRef.current = false;
        setSending(false);
        markRequestFailed();
      }
      return null;
    } finally {
      operationControllersRef.current.delete(controller);
    }
  }, [beginRequest, markRequestFailed, markThinking, observeTurn]);

  const retryTurn = useCallback(async (turnId: number, runId: number) => {
    if (sendingRef.current) return null;
    const generation = generationRef.current;
    const activeConversationId = currentConversationRef.current;
    const controller = new AbortController();
    operationControllersRef.current.add(controller);
    mutationRevisionRef.current += 1;
    sendingRef.current = true;
    setSending(true);
    beginRequest();
    markThinking();
    setTurns((current) => current.map((turn) => turn.id === turnId
      ? { ...turn, retry_allowed: false, retry_target_run_id: null }
      : turn));
    try {
      const run = await assistantAPI.retryRun(runId, crypto.randomUUID(), controller.signal);
      if (controller.signal.aborted || generation !== generationRef.current) return null;
      setTurns((current) => current.map((turn) => turn.id === turnId
        ? { ...turn, current_run: run, current_response: null }
        : turn));
      observeTurn({
        ...(turnsRef.current.find((turn) => turn.id === turnId) as AssistantTurn),
        current_run: run,
        current_response: null,
      }, generation);
      return activeConversationId;
    } catch {
      if (!controller.signal.aborted && generation === generationRef.current) {
        sendingRef.current = false;
        setSending(false);
        setTurns((current) => current.map((turn) => turn.id === turnId
          ? { ...turn, retry_allowed: true, retry_target_run_id: runId }
          : turn));
        markRequestFailed();
      }
      return null;
    } finally {
      operationControllersRef.current.delete(controller);
    }
  }, [beginRequest, markRequestFailed, markThinking, observeTurn]);

  const completeProgressiveMessage = useCallback((id: number) => {
    animatingMessageIdsRef.current.delete(id);
    revealedMessageIdsRef.current.add(id);
    setProgressiveMessageIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    markComplete();
  }, [markComplete]);

  const retryLoad = useCallback(() => {
    setLoadAttempt((value) => value + 1);
  }, []);

  return {
    turns,
    legacyMessages,
    loading,
    refreshing,
    sending,
    requestState,
    executionStage,
    longRunning,
    diagnostics,
    progressiveMessageIds,
    unavailable,
    submitMessage,
    retryTurn,
    retryLoad,
    completeProgressiveMessage,
  };
}

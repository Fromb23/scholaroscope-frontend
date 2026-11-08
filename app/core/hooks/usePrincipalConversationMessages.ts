'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { assistantAPI } from '@/app/core/api/assistant';
import { isStructuredAssistantMarkdown } from '@/app/core/components/assistant/AssistantProgressiveText';
import { type AssistantRequestState, useAssistantRequestState } from '@/app/core/components/assistant/useAssistantRequestState';
import type {
  AssistantConversation, AssistantExecutionStage, AssistantRun,
  AssistantMessage, AssistantRunDiagnostics, AssistantTurn,
} from '@/app/core/types/assistant';

export interface PrincipalConversationMessageState {
  turns: AssistantTurn[];
  legacyMessages: AssistantMessage[];
  loading: boolean;
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

const isActive = (run: AssistantRun | null) => Boolean(
  run && (run.status === 'PENDING' || run.status === 'RUNNING'),
);

export function usePrincipalConversationMessages(
  organizationId: number | null,
  conversationId: number | null,
  onConversationUpdated?: (conversation: AssistantConversation) => void,
): PrincipalConversationMessageState {
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [legacyMessages, setLegacyMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [executionStage, setExecutionStage] = useState<AssistantExecutionStage | null>(null);
  const [longRunning, setLongRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AssistantRunDiagnostics>();
  const [progressiveMessageIds, setProgressiveMessageIds] = useState<Set<number>>(new Set());
  const state = useAssistantRequestState();
  const generationRef = useRef(0);
  const controllersRef = useRef<Map<number, AbortController>>(new Map());
  const optimisticIdRef = useRef(-1);
  const createdConversationRef = useRef<number | null>(null);
  const organizationRef = useRef(organizationId);
  const pollingRef = useRef<Set<number>>(new Set());

  const cancelActive = useCallback(() => {
    generationRef.current += 1;
    controllersRef.current.forEach((controller) => controller.abort());
    controllersRef.current.clear();
    pollingRef.current.clear();
    setSending(false);
    setLongRunning(false);
    setExecutionStage(null);
  }, []);

  useEffect(() => () => cancelActive(), [cancelActive]);
  useEffect(() => {
    const organizationChanged = organizationRef.current !== organizationId;
    organizationRef.current = organizationId;
    if (!organizationChanged && createdConversationRef.current === conversationId) {
      createdConversationRef.current = null;
      return;
    }
    cancelActive();
    setTurns([]); setLegacyMessages([]); setUnavailable(false); setDiagnostics(undefined);
    setProgressiveMessageIds(new Set()); state.resetRequestState();
  // reset strictly at workspace/conversation boundaries
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, conversationId]);

  const refreshAuthoritativeTitle = useCallback((generation: number, id: number) => {
    [300, 1_200].forEach((delay) => window.setTimeout(() => {
        if (generation !== generationRef.current) return;
        assistantAPI.getConversation(id).then((conversation) => {
          if (generation === generationRef.current) onConversationUpdated?.(conversation);
        }).catch(() => undefined);
      }, delay));
  }, [onConversationUpdated]);

  const completeRun = useCallback((turnId: number, run: AssistantRun, generation: number) => {
    if (generation !== generationRef.current) return;
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
            ...attempt, status: run.status, execution_stage: run.execution_stage,
            retryable: run.retryable, response_message_id: run.assistant_message?.id ?? null,
          } : attempt)
        : turn.attempts,
    } : turn));
    if (run.assistant_message) {
      const progressive = run.assistant_message.content_blocks.some(
        (block) => block.type === 'markdown' && !isStructuredAssistantMarkdown(block.text),
      );
      if (progressive) {
        setProgressiveMessageIds((current) => new Set(current).add(run.assistant_message!.id));
        state.markTypewriting();
      } else state.markComplete();
    }
    if (run.status === 'FAILED') state.markRequestFailed();
    setSending(false); setLongRunning(false);
    if (conversationId !== null) refreshAuthoritativeTitle(generation, conversationId);
  }, [conversationId, refreshAuthoritativeTitle, state]);

  const pollRun = useCallback(async (turnId: number, runId: number, generation: number) => {
    if (pollingRef.current.has(runId)) return;
    pollingRef.current.add(runId);
    const started = Date.now();
    let failures = 0;
    try {
      while (generation === generationRef.current) {
        const controller = new AbortController();
        controllersRef.current.set(runId, controller);
        try {
          const run = await assistantAPI.getRun(runId, controller.signal);
          if (generation !== generationRef.current) return;
          failures = 0; setExecutionStage(run.execution_stage); setDiagnostics(run.diagnostics);
          setLongRunning(Date.now() - started >= 25_000);
          setTurns((current) => current.map((turn) => turn.id === turnId
            ? { ...turn, current_run: run, retry_allowed: false, retry_target_run_id: null }
            : turn));
          if (['COMPLETED', 'SUCCEEDED', 'FAILED', 'UNSUPPORTED'].includes(run.status)) {
            completeRun(turnId, run, generation); return;
          }
        } catch {
          if (controller.signal.aborted || generation !== generationRef.current) return;
          failures += 1;
          if (failures >= 5) { setSending(false); state.markRequestFailed(); return; }
        }
        await new Promise((resolve) => window.setTimeout(resolve, Math.min(4000, 750 * 2 ** failures)));
      }
    } finally {
      pollingRef.current.delete(runId);
      controllersRef.current.delete(runId);
    }
  }, [completeRun, state]);

  const observeTurn = useCallback((turn: AssistantTurn) => {
    if (!turn.current_run || !isActive(turn.current_run)) return;
    void pollRun(turn.id, turn.current_run.id, generationRef.current);
  }, [pollRun]);

  useEffect(() => {
    if (!organizationId || conversationId === null) return;
    const controller = new AbortController();
    const generation = generationRef.current;
    setLoading(true); setUnavailable(false);
    assistantAPI.listConversationMessages(conversationId, controller.signal)
      .then((history) => {
        if (generation !== generationRef.current) return;
        setTurns(history.turns);
        setLegacyMessages(history.legacy_unlinked_messages);
        history.turns.forEach(observeTurn);
      })
      .catch(() => { if (!controller.signal.aborted) setUnavailable(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [conversationId, loadAttempt, observeTurn, organizationId]);

  const submitMessage = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || !organizationId || sending) return null;
    const clientRequestId = crypto.randomUUID();
    const optimisticId = optimisticIdRef.current--;
    setTurns((current) => [...current, {
      id: optimisticId,
      user_message: { id: optimisticId, role: 'USER', client_request_id: clientRequestId,
        created_at: new Date().toISOString(), content_blocks: [{ type: 'markdown', text }] },
      current_run: null, current_response: null, retry_allowed: false,
      retry_target_run_id: null, attempts: [],
    }]);
    setSending(true); setDiagnostics(undefined); state.beginRequest(); state.markThinking();
    try {
      const response = conversationId === null
        ? await assistantAPI.createConversationMessage({ message: text, client_request_id: clientRequestId })
        : await assistantAPI.appendConversationMessage(conversationId, { message: text, client_request_id: clientRequestId });
      setTurns((current) => [...current.filter((turn) => turn.id !== optimisticId), response.turn]);
      onConversationUpdated?.(response.conversation);
      if (conversationId === null) createdConversationRef.current = response.conversation.id;
      setExecutionStage(response.execution_stage);
      observeTurn(response.turn);
      return response.conversation.id;
    } catch {
      setSending(false); state.markRequestFailed(); return null;
    }
  }, [conversationId, observeTurn, onConversationUpdated, organizationId, sending, state]);

  const retryTurn = useCallback(async (turnId: number, runId: number) => {
    if (sending) return null;
    setSending(true); state.beginRequest(); state.markThinking();
    setTurns((current) => current.map((turn) => turn.id === turnId
      ? { ...turn, retry_allowed: false, retry_target_run_id: null }
      : turn));
    try {
      const run = await assistantAPI.retryRun(runId, crypto.randomUUID());
      setTurns((current) => current.map((turn) => turn.id === turnId
        ? { ...turn, current_run: run, current_response: null }
        : turn));
      void pollRun(turnId, run.id, generationRef.current);
      return conversationId;
    } catch {
      setSending(false); setLoadAttempt((value) => value + 1); state.markRequestFailed(); return null;
    }
  }, [conversationId, pollRun, sending, state]);

  const completeProgressiveMessage = useCallback((id: number) => {
    setProgressiveMessageIds((current) => { const next = new Set(current); next.delete(id); return next; });
    state.markComplete();
  }, [state]);

  return {
    turns, legacyMessages, loading, sending, requestState: state.requestState, executionStage, longRunning,
    diagnostics, progressiveMessageIds, unavailable, submitMessage, retryTurn,
    retryLoad: () => setLoadAttempt((value) => value + 1), completeProgressiveMessage,
  };
}

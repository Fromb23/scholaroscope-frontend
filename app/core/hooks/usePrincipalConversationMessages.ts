'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { assistantAPI } from '@/app/core/api/assistant';
import { isStructuredAssistantMarkdown } from '@/app/core/components/assistant/AssistantProgressiveText';
import { type AssistantRequestState, useAssistantRequestState } from '@/app/core/components/assistant/useAssistantRequestState';
import type {
  AssistantConversation, AssistantExecutionStage, AssistantMessage,
  AssistantRun, AssistantRunDiagnostics,
} from '@/app/core/types/assistant';

export interface PrincipalConversationMessageState {
  messages: AssistantMessage[];
  loading: boolean;
  sending: boolean;
  requestState: AssistantRequestState;
  executionStage: AssistantExecutionStage | null;
  longRunning: boolean;
  diagnostics?: AssistantRunDiagnostics;
  progressiveMessageIds: ReadonlySet<number>;
  retryableError: string | null;
  unavailable: boolean;
  submitMessage: (message: string) => Promise<number | null>;
  retrySubmission: () => Promise<number | null>;
  retryLoad: () => void;
  completeProgressiveMessage: (messageId: number) => void;
}

function mergeMessages(current: AssistantMessage[], incoming: Array<AssistantMessage | null>) {
  const next = [...current];
  const seen = new Set(next.map(({ id }) => id));
  incoming.forEach((message) => {
    if (message && !seen.has(message.id)) { seen.add(message.id); next.push(message); }
  });
  return next;
}

export function usePrincipalConversationMessages(
  organizationId: number | null,
  conversationId: number | null,
  onConversationUpdated?: (conversation: AssistantConversation) => void,
): PrincipalConversationMessageState {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [executionStage, setExecutionStage] = useState<AssistantExecutionStage | null>(null);
  const [longRunning, setLongRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AssistantRunDiagnostics>();
  const [retryableError, setRetryableError] = useState<string | null>(null);
  const [progressiveMessageIds, setProgressiveMessageIds] = useState<Set<number>>(new Set());
  const state = useAssistantRequestState();
  const generationRef = useRef(0);
  const activeRunRef = useRef<number | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const optimisticIdRef = useRef(-1);
  const createdConversationRef = useRef<number | null>(null);
  const organizationRef = useRef(organizationId);

  const cancelActive = useCallback(() => {
    generationRef.current += 1;
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
    activeRunRef.current = null;
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
    setMessages([]); setUnavailable(false); setDiagnostics(undefined);
    setRetryableError(null); setProgressiveMessageIds(new Set()); state.resetRequestState();
  // reset strictly at workspace/conversation boundaries
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, conversationId]);

  useEffect(() => {
    if (!organizationId || conversationId === null) return;
    const controller = new AbortController();
    setLoading(true); setUnavailable(false);
    assistantAPI.listConversationMessages(conversationId, controller.signal)
      .then(setMessages)
      .catch(() => { if (!controller.signal.aborted) setUnavailable(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [conversationId, loadAttempt, organizationId]);

  const completeRun = useCallback((run: AssistantRun) => {
    setExecutionStage(run.execution_stage);
    setDiagnostics(run.diagnostics);
    if (run.assistant_message) {
      setMessages((current) => mergeMessages(current, [run.assistant_message]));
      const progressive = run.assistant_message.content_blocks.some(
        (block) => block.type === 'markdown' && !isStructuredAssistantMarkdown(block.text),
      );
      if (progressive) {
        setProgressiveMessageIds((current) => new Set(current).add(run.assistant_message!.id));
        state.markTypewriting();
      } else state.markComplete();
    }
    if (run.status === 'FAILED') {
      setRetryableError(run.retryable ? 'The response could not be completed. Retry is available.' : null);
      state.markRequestFailed();
    }
    activeRunRef.current = run.id;
    setSending(false); setLongRunning(false);
  }, [state]);

  const pollRun = useCallback(async (runId: number, generation: number) => {
    const started = Date.now();
    let failures = 0;
    while (generation === generationRef.current) {
      const controller = new AbortController(); activeControllerRef.current = controller;
      try {
        const run = await assistantAPI.getRun(runId, controller.signal);
        if (generation !== generationRef.current) return;
        failures = 0; setExecutionStage(run.execution_stage); setDiagnostics(run.diagnostics);
        setLongRunning(Date.now() - started >= 25_000);
        if (['COMPLETED', 'SUCCEEDED', 'FAILED', 'UNSUPPORTED'].includes(run.status)) {
          completeRun(run); return;
        }
      } catch {
        if (controller.signal.aborted || generation !== generationRef.current) return;
        failures += 1;
        if (failures >= 5) { setSending(false); state.markRequestFailed(); return; }
      }
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(4000, 750 * 2 ** failures)));
    }
  }, [completeRun, state]);

  const startPolling = useCallback((runId: number) => {
    activeRunRef.current = runId;
    const generation = ++generationRef.current;
    void pollRun(runId, generation);
  }, [pollRun]);

  const submitMessage = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || !organizationId || sending) return null;
    const clientRequestId = crypto.randomUUID();
    setMessages((current) => [...current, {
      id: optimisticIdRef.current--, role: 'USER', client_request_id: clientRequestId,
      created_at: new Date().toISOString(), content_blocks: [{ type: 'markdown', text }],
    }]);
    setSending(true); setRetryableError(null); setDiagnostics(undefined);
    state.beginRequest(); state.markThinking();
    try {
      const response = conversationId === null
        ? await assistantAPI.createConversationMessage({ message: text, client_request_id: clientRequestId })
        : await assistantAPI.appendConversationMessage(conversationId, { message: text, client_request_id: clientRequestId });
      setMessages((current) => mergeMessages(
        current.filter((message) => message.client_request_id !== clientRequestId),
        [response.user_message],
      ));
      onConversationUpdated?.(response.conversation);
      if (conversationId === null) createdConversationRef.current = response.conversation.id;
      setExecutionStage(response.execution_stage);
      startPolling(response.run_id);
      return response.conversation.id;
    } catch {
      setSending(false); setRetryableError(null); state.markRequestFailed(); return null;
    }
  }, [conversationId, onConversationUpdated, organizationId, sending, startPolling, state]);

  const retrySubmission = useCallback(async () => {
    const runId = activeRunRef.current;
    if (!runId || sending) return null;
    setSending(true); setRetryableError(null); state.beginRequest(); state.markThinking();
    try {
      const run = await assistantAPI.retryRun(runId, crypto.randomUUID());
      setExecutionStage(run.execution_stage); startPolling(run.id); return conversationId;
    } catch { setSending(false); state.markRequestFailed(); return null; }
  }, [conversationId, sending, startPolling, state]);

  const completeProgressiveMessage = useCallback((id: number) => {
    setProgressiveMessageIds((current) => { const next = new Set(current); next.delete(id); return next; });
    state.markComplete();
  }, [state]);

  return {
    messages, loading, sending, requestState: state.requestState, executionStage, longRunning,
    diagnostics, progressiveMessageIds, retryableError, unavailable, submitMessage,
    retrySubmission, retryLoad: () => setLoadAttempt((value) => value + 1),
    completeProgressiveMessage,
  };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  assistantAPI,
  isAssistantRequestTimeout,
} from '@/app/core/api/assistant';
import { isStructuredAssistantMarkdown } from '@/app/core/components/assistant/AssistantProgressiveText';
import {
  type AssistantRequestState,
  useAssistantRequestState,
} from '@/app/core/components/assistant/useAssistantRequestState';
import type { AssistantConversation, AssistantMessage } from '@/app/core/types/assistant';

interface PendingSubmission {
  message: string;
  clientRequestId: string;
  conversationId: number | null;
  organizationId: number;
}

export interface PrincipalConversationMessageState {
  messages: AssistantMessage[];
  loading: boolean;
  sending: boolean;
  requestState: AssistantRequestState;
  progressiveMessageIds: ReadonlySet<number>;
  retryableError: string | null;
  unavailable: boolean;
  submitMessage: (message: string) => Promise<number | null>;
  retrySubmission: () => Promise<number | null>;
  retryLoad: () => void;
  completeProgressiveMessage: (messageId: number) => void;
}

function mergeMessages(
  current: AssistantMessage[],
  incoming: Array<AssistantMessage | null>,
): AssistantMessage[] {
  const next = [...current];
  const seen = new Set(current.map((message) => message.id));
  incoming.forEach((message) => {
    if (message && !seen.has(message.id)) {
      seen.add(message.id);
      next.push(message);
    }
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
  const [retryableError, setRetryableError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [progressiveMessageIds, setProgressiveMessageIds] = useState<Set<number>>(new Set());
  const {
    requestState,
    beginRequest,
    markThinking,
    markTypewriting,
    markComplete,
    markProviderTimeout,
    markResponseRejected,
    markRequestFailed,
    resetRequestState,
  } = useAssistantRequestState();
  const requestGenerationRef = useRef(0);
  const organizationRef = useRef(organizationId);
  const conversationRef = useRef(conversationId);
  const sendingRef = useRef(false);
  const pendingRef = useRef<PendingSubmission | null>(null);
  const createdConversationRef = useRef<number | null>(null);
  const submissionControllerRef = useRef<AbortController | null>(null);
  const optimisticIdRef = useRef(-1);
  organizationRef.current = organizationId;
  conversationRef.current = conversationId;

  useEffect(() => {
    requestGenerationRef.current += 1;
    pendingRef.current = null;
    createdConversationRef.current = null;
    sendingRef.current = false;
    setMessages([]);
    setLoading(false);
    setSending(false);
    setRetryableError(null);
    setUnavailable(false);
    setProgressiveMessageIds(new Set());
    resetRequestState();
  }, [organizationId, resetRequestState]);

  useEffect(() => {
    const generation = ++requestGenerationRef.current;
    if (sendingRef.current) {
      submissionControllerRef.current?.abort();
      submissionControllerRef.current = null;
      sendingRef.current = false;
      pendingRef.current = null;
      setSending(false);
      setRetryableError(null);
      resetRequestState();
    }
    if (!organizationId || conversationId === null) {
      if (conversationId === null) setMessages([]);
      setLoading(false);
      setUnavailable(false);
      return;
    }
    if (createdConversationRef.current === conversationId) {
      createdConversationRef.current = null;
      setLoading(false);
      setUnavailable(false);
      return;
    }

    const controller = new AbortController();
    setMessages([]);
    setProgressiveMessageIds(new Set());
    setLoading(true);
    setUnavailable(false);
    assistantAPI.listConversationMessages(conversationId, controller.signal)
      .then((response) => {
        if (
          generation !== requestGenerationRef.current
          || organizationId !== organizationRef.current
          || conversationId !== conversationRef.current
        ) return;
        setMessages(response);
      })
      .catch(() => {
        if (!controller.signal.aborted && generation === requestGenerationRef.current) {
          setUnavailable(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && generation === requestGenerationRef.current) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [conversationId, loadAttempt, organizationId, resetRequestState]);

  const performSubmission = useCallback(async (
    pending: PendingSubmission,
  ): Promise<number | null> => {
    if (sendingRef.current) return null;
    const generation = requestGenerationRef.current;
    const controller = new AbortController();
    submissionControllerRef.current = controller;
    sendingRef.current = true;
    setSending(true);
    setRetryableError(null);
    beginRequest();
    markThinking();
    try {
      const payload = {
        message: pending.message,
        client_request_id: pending.clientRequestId,
      };
      const response = pending.conversationId === null
        ? await assistantAPI.createConversationMessage(payload, controller.signal)
        : await assistantAPI.appendConversationMessage(
          pending.conversationId,
          payload,
          controller.signal,
        );
      if (
        generation !== requestGenerationRef.current
        || pending.organizationId !== organizationRef.current
        || pending.conversationId !== conversationRef.current
      ) return null;
      setMessages((current) => mergeMessages(
        current.filter((message) => !(
          message.role === 'USER'
          && message.client_request_id === pending.clientRequestId
        )),
        [response.user_message, response.assistant_message],
      ));
      onConversationUpdated?.(response.conversation);
      const errorBlock = response.assistant_message?.content_blocks.find(
        (block) => block.type === 'error',
      );
      if (errorBlock?.type === 'error') {
        pendingRef.current = {
          ...pending,
          conversationId: response.conversation.id,
        };
        if (errorBlock.code === 'assistant_provider_timeout') {
          setRetryableError('The response took too long to complete. Please retry.');
          markProviderTimeout();
        } else if (errorBlock.code === 'assistant_response_rejected') {
          setRetryableError('I couldn’t complete that response safely. Please retry.');
          markResponseRejected();
        } else {
          setRetryableError('The response could not be completed. Please retry.');
          markRequestFailed();
        }
      } else {
        pendingRef.current = null;
        const progressive = response.assistant_message?.content_blocks.some(
          (block) => block.type === 'markdown'
            && !isStructuredAssistantMarkdown(block.text),
        );
        if (response.assistant_message && progressive) {
          setProgressiveMessageIds((current) => new Set(current).add(response.assistant_message!.id));
          markTypewriting();
        } else {
          markComplete();
        }
      }
      if (pending.conversationId === null) {
        createdConversationRef.current = response.conversation.id;
      }
      return response.conversation.id;
    } catch (error) {
      if (
        !controller.signal.aborted
        && generation === requestGenerationRef.current
        && pending.organizationId === organizationRef.current
        && pending.conversationId === conversationRef.current
      ) {
        pendingRef.current = pending;
        if (isAssistantRequestTimeout(error)) {
          setRetryableError('The response took too long to complete. Please retry.');
          markProviderTimeout();
        } else {
          setRetryableError('The response could not be completed. Please retry.');
          markRequestFailed();
        }
      }
      return null;
    } finally {
      if (generation === requestGenerationRef.current) {
        submissionControllerRef.current = null;
        sendingRef.current = false;
        setSending(false);
      }
    }
  }, [
    beginRequest,
    markComplete,
    markProviderTimeout,
    markRequestFailed,
    markResponseRejected,
    markThinking,
    markTypewriting,
    onConversationUpdated,
  ]);

  const submitMessage = useCallback(async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || !organizationId || sendingRef.current) return null;
    const pending: PendingSubmission = {
      message,
      clientRequestId: crypto.randomUUID(),
      conversationId,
      organizationId,
    };
    pendingRef.current = pending;
    const optimisticMessage: AssistantMessage = {
      id: optimisticIdRef.current--,
      role: 'USER',
      content_blocks: [{ type: 'markdown', text: message }],
      client_request_id: pending.clientRequestId,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimisticMessage]);
    return performSubmission(pending);
  }, [conversationId, organizationId, performSubmission]);

  const retrySubmission = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending || sendingRef.current) return null;
    return performSubmission(pending);
  }, [performSubmission]);

  const completeProgressiveMessage = useCallback((messageId: number) => {
    setProgressiveMessageIds((current) => {
      if (!current.has(messageId)) return current;
      const next = new Set(current);
      next.delete(messageId);
      return next;
    });
    markComplete();
  }, [markComplete]);

  return {
    messages,
    loading,
    sending,
    requestState,
    progressiveMessageIds,
    retryableError,
    unavailable,
    submitMessage,
    retrySubmission,
    retryLoad: () => setLoadAttempt((attempt) => attempt + 1),
    completeProgressiveMessage,
  };
}

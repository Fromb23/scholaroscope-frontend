'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { assistantAPI } from '@/app/core/api/assistant';
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
  retryableError: string | null;
  unavailable: boolean;
  submitMessage: (message: string) => Promise<number | null>;
  retrySubmission: () => Promise<number | null>;
  retryLoad: () => void;
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
  const requestGenerationRef = useRef(0);
  const organizationRef = useRef(organizationId);
  const conversationRef = useRef(conversationId);
  const sendingRef = useRef(false);
  const pendingRef = useRef<PendingSubmission | null>(null);
  const createdConversationRef = useRef<number | null>(null);
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
  }, [organizationId]);

  useEffect(() => {
    const generation = ++requestGenerationRef.current;
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
  }, [conversationId, loadAttempt, organizationId]);

  const performSubmission = useCallback(async (
    pending: PendingSubmission,
  ): Promise<number | null> => {
    if (sendingRef.current) return null;
    const generation = requestGenerationRef.current;
    sendingRef.current = true;
    setSending(true);
    setRetryableError(null);
    try {
      const payload = {
        message: pending.message,
        client_request_id: pending.clientRequestId,
      };
      const response = pending.conversationId === null
        ? await assistantAPI.createConversationMessage(payload)
        : await assistantAPI.appendConversationMessage(pending.conversationId, payload);
      if (
        generation !== requestGenerationRef.current
        || pending.organizationId !== organizationRef.current
        || pending.conversationId !== conversationRef.current
      ) return null;
      setMessages((current) => mergeMessages(
        current,
        [response.user_message, response.assistant_message],
      ));
      onConversationUpdated?.(response.conversation);
      pendingRef.current = null;
      if (pending.conversationId === null) {
        createdConversationRef.current = response.conversation.id;
      }
      return response.conversation.id;
    } catch {
      if (
        generation === requestGenerationRef.current
        && pending.organizationId === organizationRef.current
        && pending.conversationId === conversationRef.current
      ) {
        pendingRef.current = pending;
        setRetryableError('Your question could not be sent. It is safe to retry.');
      }
      return null;
    } finally {
      if (generation === requestGenerationRef.current) {
        sendingRef.current = false;
        setSending(false);
      }
    }
  }, [onConversationUpdated]);

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
    return performSubmission(pending);
  }, [conversationId, organizationId, performSubmission]);

  const retrySubmission = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending || sendingRef.current) return null;
    return performSubmission(pending);
  }, [performSubmission]);

  return {
    messages,
    loading,
    sending,
    retryableError,
    unavailable,
    submitMessage,
    retrySubmission,
    retryLoad: () => setLoadAttempt((attempt) => attempt + 1),
  };
}

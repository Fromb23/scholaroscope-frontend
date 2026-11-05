import { apiClient } from '@/app/core/api/client';
import type {
  AssistantConversation,
  AssistantConversationListResponse,
  AssistantConversationMessageResponse,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantFeedbackPayload,
  AssistantFeedbackResponse,
  AssistantMessage,
  AssistantMessageCreatePayload,
  AssistantSuggestRequest,
  AssistantSuggestResponse,
} from '@/app/core/types/assistant';
import axios from 'axios';

const OVERSIGHT_CONTEXT_HEADERS = {
  'X-Scholaroscope-Operating-Context': 'INSTITUTION_OVERSIGHT',
} as const;

export const ASSISTANT_REQUEST_TIMEOUT_MS = 45_000;

export function isAssistantRequestTimeout(error: unknown): boolean {
  return axios.isAxiosError(error) && error.code === 'ECONNABORTED';
}

const assistantRequestConfig = (signal?: AbortSignal) => ({
  headers: OVERSIGHT_CONTEXT_HEADERS,
  signal,
  timeout: ASSISTANT_REQUEST_TIMEOUT_MS,
});

export const assistantAPI = {
  listConversations: async (
    params: { page?: number; page_size?: number; q?: string } = {},
    signal?: AbortSignal,
  ): Promise<AssistantConversationListResponse> => {
    const response = await apiClient.get<AssistantConversationListResponse>(
      '/assistant/conversations/',
      { params, signal, headers: OVERSIGHT_CONTEXT_HEADERS },
    );
    return response.data;
  },

  getConversation: async (
    conversationId: number,
    signal?: AbortSignal,
  ): Promise<AssistantConversation> => {
    const response = await apiClient.get<AssistantConversation>(
      `/assistant/conversations/${conversationId}/`,
      { signal, headers: OVERSIGHT_CONTEXT_HEADERS },
    );
    return response.data;
  },

  renameConversation: async (
    conversationId: number,
    title: string,
  ): Promise<AssistantConversation> => {
    const response = await apiClient.patch<AssistantConversation>(
      `/assistant/conversations/${conversationId}/`,
      { title },
      { headers: OVERSIGHT_CONTEXT_HEADERS },
    );
    return response.data;
  },

  createConversationMessage: async (
    payload: AssistantMessageCreatePayload,
    signal?: AbortSignal,
  ): Promise<AssistantConversationMessageResponse> => {
    const response = await apiClient.post<AssistantConversationMessageResponse>(
      '/assistant/conversations/messages/',
      payload,
      assistantRequestConfig(signal),
    );
    return response.data;
  },

  listConversationMessages: async (
    conversationId: number,
    signal?: AbortSignal,
  ): Promise<AssistantMessage[]> => {
    const response = await apiClient.get<AssistantMessage[]>(
      `/assistant/conversations/${conversationId}/messages/`,
      { signal, headers: OVERSIGHT_CONTEXT_HEADERS },
    );
    return response.data;
  },

  appendConversationMessage: async (
    conversationId: number,
    payload: AssistantMessageCreatePayload,
    signal?: AbortSignal,
  ): Promise<AssistantConversationMessageResponse> => {
    const response = await apiClient.post<AssistantConversationMessageResponse>(
      `/assistant/conversations/${conversationId}/messages/`,
      payload,
      assistantRequestConfig(signal),
    );
    return response.data;
  },

  deleteConversation: async (conversationId: number): Promise<void> => {
    await apiClient.delete(
      `/assistant/conversations/${conversationId}/`,
      { headers: OVERSIGHT_CONTEXT_HEADERS },
    );
  },

  chat: async (payload: AssistantChatRequest): Promise<AssistantChatResponse> => {
    const response = await apiClient.post<AssistantChatResponse>('/assistant/chat/', payload);
    return response.data;
  },

  suggest: async (payload: AssistantSuggestRequest): Promise<AssistantSuggestResponse> => {
    const response = await apiClient.post<AssistantSuggestResponse>('/assistant/suggest/', payload);
    return response.data;
  },

  submitFeedback: async (
    payload: AssistantFeedbackPayload
  ): Promise<AssistantFeedbackResponse> => {
    const response = await apiClient.post<AssistantFeedbackResponse>(
      '/assistant/feedback/',
      payload
    );
    return response.data;
  },
};

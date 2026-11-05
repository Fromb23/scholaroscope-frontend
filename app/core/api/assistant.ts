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

const OVERSIGHT_CONTEXT_HEADERS = {
  'X-Scholaroscope-Operating-Context': 'INSTITUTION_OVERSIGHT',
} as const;

export const assistantAPI = {
  listConversations: async (
    params: { page?: number; page_size?: number; q?: string } = {},
    signal?: AbortSignal,
  ): Promise<AssistantConversationListResponse> => {
    const response = await apiClient.get<AssistantConversationListResponse>(
      '/assistant/conversations/',
      { params, signal },
    );
    return response.data;
  },

  getConversation: async (
    conversationId: number,
    signal?: AbortSignal,
  ): Promise<AssistantConversation> => {
    const response = await apiClient.get<AssistantConversation>(
      `/assistant/conversations/${conversationId}/`,
      { signal },
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
    );
    return response.data;
  },

  createConversationMessage: async (
    payload: AssistantMessageCreatePayload,
  ): Promise<AssistantConversationMessageResponse> => {
    const response = await apiClient.post<AssistantConversationMessageResponse>(
      '/assistant/conversations/messages/',
      payload,
      { headers: OVERSIGHT_CONTEXT_HEADERS },
    );
    return response.data;
  },

  listConversationMessages: async (
    conversationId: number,
    signal?: AbortSignal,
  ): Promise<AssistantMessage[]> => {
    const response = await apiClient.get<AssistantMessage[]>(
      `/assistant/conversations/${conversationId}/messages/`,
      { signal },
    );
    return response.data;
  },

  appendConversationMessage: async (
    conversationId: number,
    payload: AssistantMessageCreatePayload,
  ): Promise<AssistantConversationMessageResponse> => {
    const response = await apiClient.post<AssistantConversationMessageResponse>(
      `/assistant/conversations/${conversationId}/messages/`,
      payload,
      { headers: OVERSIGHT_CONTEXT_HEADERS },
    );
    return response.data;
  },

  deleteConversation: async (conversationId: number): Promise<void> => {
    await apiClient.delete(`/assistant/conversations/${conversationId}/`);
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

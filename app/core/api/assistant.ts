import { apiClient } from '@/app/core/api/client';
import type {
  AssistantConversation,
  AssistantConversationListResponse,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantFeedbackPayload,
  AssistantFeedbackResponse,
  AssistantSuggestRequest,
  AssistantSuggestResponse,
} from '@/app/core/types/assistant';

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

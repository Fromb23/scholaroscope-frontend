import { apiClient } from '@/app/core/api/client';
import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantFeedbackPayload,
  AssistantFeedbackResponse,
  AssistantSuggestRequest,
  AssistantSuggestResponse,
} from '@/app/core/types/assistant';

export const assistantAPI = {
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


import { AxiosError, CanceledError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@/app/core/api/client', () => ({
  apiClient: {
    post: mocks.post,
  },
}));

import {
  ASSISTANT_REQUEST_TIMEOUT_MS,
  assistantAPI,
  isAssistantRequestTimeout,
} from './assistant';

describe('assistant conversation request timeout', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({ data: {} });
  });

  it('uses a bounded assistant-only timeout and caller cancellation signal', async () => {
    const controller = new AbortController();

    await assistantAPI.createConversationMessage(
      { message: 'Hello', client_request_id: 'request-1' },
      controller.signal,
    );

    expect(ASSISTANT_REQUEST_TIMEOUT_MS).toBe(45_000);
    expect(mocks.post).toHaveBeenCalledWith(
      '/assistant/conversations/messages/',
      { message: 'Hello', client_request_id: 'request-1' },
      expect.objectContaining({
        timeout: 45_000,
        signal: controller.signal,
      }),
    );
  });

  it('distinguishes an Axios timeout from manual cancellation', () => {
    const timeout = new AxiosError('timeout', 'ECONNABORTED');
    const cancellation = new CanceledError('navigation');

    expect(isAssistantRequestTimeout(timeout)).toBe(true);
    expect(isAssistantRequestTimeout(cancellation)).toBe(false);
  });
});

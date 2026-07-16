import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  apiClient,
  refreshClient,
  registerAuthFailureHandler,
} from '@/app/core/api/client';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '@/app/core/auth/tokenStore';
import {
  advanceWorkspaceGeneration,
  resetWorkspaceGenerationForTests,
} from '@/app/core/runtime/workspaceGeneration';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type ResponseRejectedHandler = (error: unknown) => Promise<unknown>;

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(cycles = 5): Promise<void> {
  for (let i = 0; i < cycles; i += 1) {
    await Promise.resolve();
  }
}

function response<T>(
  config: InternalAxiosRequestConfig,
  data: T,
  headers: Record<string, string> = {},
): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers,
    config,
    request: {},
  };
}

function statusError(
  config: InternalAxiosRequestConfig,
  status: number,
  message = 'Request failed',
): AxiosError {
  return new AxiosError(
    message,
    AxiosError.ERR_BAD_REQUEST,
    config,
    {},
    {
      data: { detail: message },
      status,
      statusText: String(status),
      headers: {},
      config,
      request: {},
    },
  );
}

function readAuthorization(config: InternalAxiosRequestConfig): string | null {
  const headers = config.headers as Record<string, unknown> & {
    get?: (header: string) => unknown;
  };
  const value = headers.Authorization
    ?? headers.authorization
    ?? headers.get?.('Authorization')
    ?? null;
  return typeof value === 'string' ? value : null;
}

function requestConfig(url: string): RetryableRequestConfig {
  return {
    url,
    method: 'get',
    headers: {},
  } as RetryableRequestConfig;
}

function getAuthRejectedHandler(): ResponseRejectedHandler {
  const manager = apiClient.interceptors.response as unknown as {
    handlers: Array<{ rejected?: ResponseRejectedHandler | null } | null>;
  };
  const handler = manager.handlers.find((entry) => typeof entry?.rejected === 'function');
  if (!handler?.rejected) {
    throw new Error('apiClient auth response interceptor is not registered');
  }
  return handler.rejected;
}

const originalApiAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  resetWorkspaceGenerationForTests();
  clearAccessToken();
  registerAuthFailureHandler(null);
});

afterEach(() => {
  apiClient.defaults.adapter = originalApiAdapter;
  registerAuthFailureHandler(null);
  clearAccessToken();
  resetWorkspaceGenerationForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('runtime auth refresh boundaries', () => {
  it('rejects a successful response that resolves after a workspace switch', async () => {
    const responseGate = deferred<AxiosResponse<{ workspace: string }>>();
    let capturedConfig: InternalAxiosRequestConfig | null = null;

    apiClient.defaults.adapter = (async (config) => {
      capturedConfig = config;
      return responseGate.promise;
    }) satisfies AxiosAdapter;

    const request = apiClient.get('/sessions/');
    await flushMicrotasks();
    advanceWorkspaceGeneration('workspace-switch');
    responseGate.resolve(response(capturedConfig!, { workspace: 'A' }));

    await expect(request).rejects.toThrow('earlier workspace or authentication generation');
  });

  it('concurrent 401 responses share one refresh and retry with the fresh token', async () => {
    setAccessToken('stale-access');
    const refreshGate = deferred<{ access: string }>();
    let refreshCalls = 0;
    const retries: Array<{ url?: string; retry: boolean; authorization: string | null }> = [];
    const handle401 = getAuthRejectedHandler();

    apiClient.defaults.adapter = (async (config) => {
      const retry = Boolean((config as RetryableRequestConfig)._retry);
      retries.push({
        url: config.url,
        retry,
        authorization: readAuthorization(config),
      });
      return response(config, { ok: true });
    }) satisfies AxiosAdapter;

    const refreshPost = vi.spyOn(refreshClient, 'post').mockImplementation(async () => {
      refreshCalls += 1;
      return response({ headers: {} } as InternalAxiosRequestConfig, await refreshGate.promise);
    });

    const requests = [
      handle401(statusError(requestConfig('/students/'), 401, 'Access token expired')),
      handle401(statusError(requestConfig('/academic/curricula/'), 401, 'Access token expired')),
      handle401(statusError(requestConfig('/workspace-access/me/'), 401, 'Access token expired')),
    ];

    await flushMicrotasks();
    expect(refreshPost).toHaveBeenCalledOnce();
    expect(refreshCalls).toBe(1);

    refreshGate.resolve({ access: 'fresh-access' });
    await expect(Promise.all(requests)).resolves.toHaveLength(3);

    expect(retries).toHaveLength(3);
    expect(retries.map((call) => call.authorization)).toEqual([
      'Bearer fresh-access',
      'Bearer fresh-access',
      'Bearer fresh-access',
    ]);
    expect(refreshCalls).toBe(1);
    expect(getAccessToken()).toBe('fresh-access');
  });

  it('logout during refresh cannot restore authentication after refresh resolves', async () => {
    setAccessToken('stale-access');
    const authFailureHandler = vi.fn();
    const refreshGate = deferred<{ access: string }>();
    const handle401 = getAuthRejectedHandler();
    registerAuthFailureHandler(authFailureHandler);

    apiClient.defaults.adapter = (async (config) => {
      return response(config, { ok: true });
    }) satisfies AxiosAdapter;

    const refreshPost = vi.spyOn(refreshClient, 'post').mockImplementation(async () => (
      response({ headers: {} } as InternalAxiosRequestConfig, await refreshGate.promise)
    ));

    const request = handle401(statusError(requestConfig('/students/'), 401, 'Access token expired'));

    await flushMicrotasks();
    expect(refreshPost).toHaveBeenCalledOnce();
    clearAccessToken();
    refreshGate.resolve({ access: 'fresh-after-logout' });

    await expect(request).rejects.toThrow('Auth refresh was superseded');
    expect(getAccessToken()).toBeNull();
    expect(authFailureHandler).not.toHaveBeenCalled();
  });

  it('failed refresh clears authentication and invokes the auth failure handler', async () => {
    setAccessToken('stale-access');
    const authFailureHandler = vi.fn();
    const handle401 = getAuthRejectedHandler();
    registerAuthFailureHandler(authFailureHandler);

    vi.spyOn(refreshClient, 'post').mockImplementation(async () => {
      throw statusError({ headers: {} } as InternalAxiosRequestConfig, 401, 'Refresh denied');
    });

    await expect(
      handle401(statusError(requestConfig('/students/'), 401, 'Access token expired')),
    ).rejects.toThrow('Refresh denied');

    expect(getAccessToken()).toBeNull();
    expect(authFailureHandler).toHaveBeenCalledOnce();
  });

  it('membership-version changes emit the runtime context reload signal', async () => {
    const storedValues = new Map<string, string>([['membership_version', '7']]);
    const dispatchedEvents: string[] = [];

    vi.stubGlobal('CustomEvent', class RuntimeCustomEvent {
      type: string;

      constructor(type: string) {
        this.type = type;
      }
    });
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storedValues.get(key) ?? null,
        setItem: (key: string, value: string) => storedValues.set(key, value),
      },
      dispatchEvent: (event: { type: string }) => {
        dispatchedEvents.push(event.type);
        return true;
      },
    });

    apiClient.defaults.adapter = (async (config) => (
      response(config, { ok: true }, { 'x-membership-version': '8' })
    )) satisfies AxiosAdapter;

    await apiClient.get('/users/me_context/');

    expect(storedValues.get('membership_version')).toBe('8');
    expect(dispatchedEvents).toEqual(['membership-version-mismatch']);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { isNetworkError } from './networkDetection';

function setNavigatorOnline(onLine: boolean) {
  vi.stubGlobal('navigator', { onLine });
}

describe('isNetworkError', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true for an Axios network error with no response and ERR_NETWORK', () => {
    setNavigatorOnline(true);

    expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
  });

  it('returns true for an Axios timeout or aborted request with no response', () => {
    setNavigatorOnline(true);

    expect(isNetworkError({ code: 'ECONNABORTED' })).toBe(true);
  });

  it('returns false for a 401 response from the server', () => {
    setNavigatorOnline(true);

    expect(isNetworkError({ response: { status: 401 }, code: 'ERR_BAD_REQUEST' })).toBe(false);
  });

  it('returns false for a 500 response from the server', () => {
    setNavigatorOnline(true);

    expect(isNetworkError({ response: { status: 500 }, code: 'ERR_BAD_RESPONSE' })).toBe(false);
  });

  it('returns true when the browser reports it is offline', () => {
    setNavigatorOnline(false);

    expect(isNetworkError(new Error('offline'))).toBe(true);
  });
});

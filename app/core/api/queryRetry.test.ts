import { describe, expect, it } from 'vitest';

import { shouldRetryQuery } from './queryRetry';

describe('React Query retry policy', () => {
  it('does not retry final authorization and scoped not-found responses', () => {
    for (const status of [401, 403, 404]) {
      expect(shouldRetryQuery(0, { response: { status } })).toBe(false);
    }
  });

  it('allows only limited retries for transient failures', () => {
    expect(shouldRetryQuery(0, { response: { status: 500 } })).toBe(true);
    expect(shouldRetryQuery(1, { response: { status: 503 } })).toBe(true);
    expect(shouldRetryQuery(2, { response: { status: 503 } })).toBe(false);
  });

  it('does not retry wrapped authorization failures', () => {
    const wrapped = Object.assign(new Error('Forbidden'), {
      cause: { response: { status: 403 } },
    });

    expect(shouldRetryQuery(0, wrapped)).toBe(false);
  });

  it('keeps retrying wrapped transient server failures within the limit', () => {
    const wrapped = Object.assign(new Error('Server error'), {
      cause: { response: { status: 500 } },
    });

    expect(shouldRetryQuery(0, wrapped)).toBe(true);
    expect(shouldRetryQuery(2, wrapped)).toBe(false);
  });
});

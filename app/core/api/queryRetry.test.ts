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
});

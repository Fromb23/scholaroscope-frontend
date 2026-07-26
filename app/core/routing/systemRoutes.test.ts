import { describe, expect, it } from 'vitest';

import { isSystemOwnedRoute } from './systemRoutes';

describe('system-owned route classification', () => {
  it('treats canonical get-started onboarding as a system surface', () => {
    expect(isSystemOwnedRoute('/get-started')).toBe(true);
    expect(isSystemOwnedRoute('/get-started/details')).toBe(true);
  });

  it('keeps the legacy workspace creation redirect route system-themed before redirect completes', () => {
    expect(isSystemOwnedRoute('/workspaces/new')).toBe(true);
    expect(isSystemOwnedRoute('/workspaces/new/details')).toBe(true);
  });

  it('does not classify ordinary workspace routes as system surfaces', () => {
    expect(isSystemOwnedRoute('/dashboard')).toBe(false);
    expect(isSystemOwnedRoute('/academic/learners')).toBe(false);
  });
});

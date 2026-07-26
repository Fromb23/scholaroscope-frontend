import { describe, expect, it } from 'vitest';

import { isSystemOwnedRoute } from './systemRoutes';

describe('system-owned route classification', () => {
  it('treats workspace creation and onboarding descendants as system surfaces', () => {
    expect(isSystemOwnedRoute('/workspaces/new')).toBe(true);
    expect(isSystemOwnedRoute('/workspaces/new/details')).toBe(true);
  });

  it('does not classify ordinary workspace routes as system surfaces', () => {
    expect(isSystemOwnedRoute('/dashboard')).toBe(false);
    expect(isSystemOwnedRoute('/academic/learners')).toBe(false);
  });
});

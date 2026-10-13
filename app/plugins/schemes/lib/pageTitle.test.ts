import { describe, expect, it } from 'vitest';

import { getSchemesPageTitle } from './pageTitle';

describe('schemes page titles', () => {
  it('matches each existing schemes surface', () => {
    expect(getSchemesPageTitle(true, false)).toBe('My Schemes of Work');
    expect(getSchemesPageTitle(false, true)).toBe('Schemes of Work Supervision');
    expect(getSchemesPageTitle(false, false)).toBe('Schemes of Work');
  });
});

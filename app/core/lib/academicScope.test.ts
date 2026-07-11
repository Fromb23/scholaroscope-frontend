import { describe, expect, it } from 'vitest';

import { withOperationalScope } from './academicScope';

describe('academic operational scope params', () => {
  it('defaults blank operational filters to current scope', () => {
    expect(withOperationalScope({ search: '', status: undefined })).toEqual({
      scope: 'current',
    });
  });

  it('keeps explicit historical scope without adding current', () => {
    expect(withOperationalScope({ scope: 'historical', page: 2 })).toEqual({
      scope: 'historical',
      page: 2,
    });
  });

  it('promotes term aliases to explicit term selection', () => {
    expect(withOperationalScope({ session__term: 7 }, ['session__term'])).toEqual({
      session__term: 7,
      term: 7,
    });
  });
});

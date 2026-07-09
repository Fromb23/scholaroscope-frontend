import { describe, expect, it } from 'vitest';
import { unwrapPaginated } from './unwrap';

describe('unwrapPaginated', () => {
  it('returns array responses unchanged', () => {
    const data = [{ id: 1 }, { id: 2 }];

    expect(unwrapPaginated(data)).toBe(data);
  });

  it('returns results from paginated responses', () => {
    expect(unwrapPaginated({ count: 1, results: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('falls back to an empty array when results are missing', () => {
    expect(unwrapPaginated<{ id: number }>({ count: 0 })).toEqual([]);
  });
});

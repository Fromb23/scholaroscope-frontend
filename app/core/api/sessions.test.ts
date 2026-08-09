import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sessionAPI } from '@/app/core/api/sessions';

const { get } = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/app/core/api/client', () => ({
  apiClient: {
    defaults: {
      baseURL: 'http://127.0.0.1:8000/api',
    },
    get,
  },
}));

describe('session API complete pagination', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('incorporates every paginated page before returning sessions', async () => {
    get
      .mockResolvedValueOnce({
        data: {
          count: 12,
          next: 'http://127.0.0.1:8000/api/sessions/?page=2',
          previous: null,
          results: Array.from({ length: 10 }, (_, index) => ({ id: index + 1 })),
        },
      })
      .mockResolvedValueOnce({
        data: {
          count: 12,
          next: null,
          previous: 'http://127.0.0.1:8000/api/sessions/',
          results: [{ id: 11 }, { id: 12 }],
        },
      });

    const sessions = await sessionAPI.getAllComplete({ term: 3 });

    expect(sessions.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(get).toHaveBeenNthCalledWith(1, '/sessions/', {
      params: { term: 3 },
      signal: undefined,
    });
    expect(get).toHaveBeenNthCalledWith(2, '/sessions/?page=2', {
      signal: undefined,
    });
  });

  it('rejects untrusted next URLs instead of presenting partial data as complete', async () => {
    get.mockResolvedValueOnce({
      data: {
        count: 11,
        next: 'https://attacker.example/api/sessions/?page=2',
        previous: null,
        results: Array.from({ length: 10 }, (_, index) => ({ id: index + 1 })),
      },
    });

    await expect(sessionAPI.getSupervisedComplete({ authority_mode: 'supervision' }))
      .rejects
      .toThrow('external pagination URL');
  });

  it('rejects truncated pagination before exposing a partial aggregate', async () => {
    get.mockResolvedValueOnce({
      data: {
        count: 12,
        next: null,
        previous: null,
        results: Array.from({ length: 10 }, (_, index) => ({ id: index + 1 })),
      },
    });

    await expect(sessionAPI.getAllComplete()).rejects.toThrow('complete result set');
  });

  it('propagates supervision authority to session-detail reads', async () => {
    get.mockResolvedValue({ data: {} });

    await sessionAPI.getById(42, 'supervision');
    await sessionAPI.getClosureState(42, 'supervision');
    await sessionAPI.getAttendanceRecords(42, {
      page_size: 1000,
      authority_mode: 'supervision',
    });

    expect(get).toHaveBeenNthCalledWith(1, '/sessions/42/', {
      params: { authority_mode: 'supervision' },
    });
    expect(get).toHaveBeenNthCalledWith(2, '/sessions/42/closure-state/', {
      params: { authority_mode: 'supervision' },
    });
    expect(get).toHaveBeenNthCalledWith(3, '/sessions/42/attendance-records/', {
      params: { page_size: 1000, authority_mode: 'supervision' },
    });
  });
});

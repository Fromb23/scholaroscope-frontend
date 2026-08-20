import { afterEach, describe, expect, it, vi } from 'vitest';

import { launchTimetablePortal } from '@/app/plugins/timetable/api/timetable';

vi.mock('@/app/core/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '@/app/core/api/client';

describe('launchTimetablePortal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('posts the exact canonical body string signed by the backend', async () => {
    const canonicalBody = '{"a":1,"z":2}';
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        launch_action: {
          method: 'POST',
          url: 'https://timetable.example.test/portal/launch/exchange',
          body: { z: 2, a: 1 },
          body_json: canonicalBody,
          headers: {
            'Content-Type': 'application/json',
            'X-Scholaroscope-Signature': 'sha256=test',
          },
          expires_at: '2026-08-20T10:00:00Z',
          correlation_id: 'correlation',
        },
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const assignMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location: { assign: assignMock } });

    await launchTimetablePortal();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://timetable.example.test/portal/launch/exchange',
      expect.objectContaining({
        body: canonicalBody,
        credentials: 'include',
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: JSON.stringify({ z: 2, a: 1 }) }),
    );
    expect(assignMock).toHaveBeenCalledWith('https://timetable.example.test');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { launchTimetablePortal, refreshTimetableAcademicData } from '@/app/plugins/timetable/api/timetable';

vi.mock('@/app/core/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '@/app/core/api/client';

function createPendingWindow() {
  const pendingWindow = {
    closed: false,
    opener: { retained: true } as unknown,
    location: {
      replace: vi.fn(),
    },
    close: vi.fn(),
  };

  pendingWindow.close.mockImplementation(() => {
    pendingWindow.closed = true;
  });

  return pendingWindow;
}

function createLaunchResponse(overrides?: Partial<{
  method: 'POST';
  url: string;
  body: Record<string, unknown>;
  body_json: string;
  headers: Record<string, string>;
  expires_at: string;
  correlation_id: string;
}>) {
  return {
    data: {
      launch_action: {
        method: 'POST' as const,
        url: 'https://timetable.example.test/portal/launch/exchange',
        body: { z: 2, a: 1 },
        body_json: '{"a":1,"z":2}',
        headers: {
          'Content-Type': 'application/json',
          'X-Scholaroscope-Signature': 'sha256=test',
        },
        expires_at: '2026-08-20T10:00:00Z',
        correlation_id: 'correlation',
        ...overrides,
      },
    },
  };
}

describe('launchTimetablePortal', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens one blank tab synchronously, isolates it, exchanges the canonical body, and redirects the existing tab', async () => {
    const canonicalBody = '{"nested":{"a":1,"b":2},"z":2}';
    const launchResponse = createLaunchResponse({
      body: { z: 2, nested: { b: 2, a: 1 } },
      body_json: canonicalBody,
    });
    const pendingWindow = createPendingWindow();
    const openMock = vi.fn().mockReturnValue(pendingWindow);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });

    vi.mocked(apiClient.post).mockImplementation(() => {
      expect(pendingWindow.opener).toBeNull();
      return Promise.resolve(launchResponse);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { open: openMock });

    const launchPromise = launchTimetablePortal();

    expect(openMock.mock.calls).toEqual([['about:blank', '_blank']]);

    await launchPromise;

    expect(apiClient.post).toHaveBeenCalledWith('/plugins/timetable/launch/');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://timetable.example.test/portal/launch/exchange',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Scholaroscope-Signature': 'sha256=test',
        },
        body: canonicalBody,
        credentials: 'include',
      },
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: JSON.stringify({ z: 2, nested: { b: 2, a: 1 } }) }),
    );
    expect(pendingWindow.location.replace).toHaveBeenCalledWith('https://timetable.example.test');
    expect(pendingWindow.close).not.toHaveBeenCalled();
    expect(openMock).toHaveBeenCalledTimes(1);
  });

  it('does not request a launch grant when the popup is blocked', async () => {
    const openMock = vi.fn().mockReturnValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { open: openMock });

    await expect(launchTimetablePortal()).rejects.toThrow(
      'The browser blocked the timetable portal tab. Allow pop-ups for Scholaroscope and try again.',
    );

    expect(openMock.mock.calls).toEqual([['about:blank', '_blank']]);
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('closes the blank tab when backend launch preparation fails', async () => {
    const pendingWindow = createPendingWindow();
    const openMock = vi.fn().mockReturnValue(pendingWindow);
    const fetchMock = vi.fn();
    vi.mocked(apiClient.post).mockRejectedValue(new Error('backend unavailable'));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { open: openMock });

    await expect(launchTimetablePortal()).rejects.toThrow(
      'Timetable portal launch could not be prepared. Try again.',
    );

    expect(openMock.mock.calls).toEqual([['about:blank', '_blank']]);
    expect(pendingWindow.close).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('closes the blank tab when the exchange is rejected', async () => {
    const pendingWindow = createPendingWindow();
    const openMock = vi.fn().mockReturnValue(pendingWindow);
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.mocked(apiClient.post).mockResolvedValue(createLaunchResponse());
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { open: openMock });

    await expect(launchTimetablePortal()).rejects.toThrow(
      'Timetable portal launch was rejected.',
    );

    expect(openMock.mock.calls).toEqual([['about:blank', '_blank']]);
    expect(pendingWindow.close).toHaveBeenCalledTimes(1);
  });

  it('closes the blank tab when the exchange network request fails', async () => {
    const pendingWindow = createPendingWindow();
    const openMock = vi.fn().mockReturnValue(pendingWindow);
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.mocked(apiClient.post).mockResolvedValue(createLaunchResponse());
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { open: openMock });

    await expect(launchTimetablePortal()).rejects.toThrow(
      'Timetable portal launch exchange failed. Check your connection and try again.',
    );

    expect(openMock.mock.calls).toEqual([['about:blank', '_blank']]);
    expect(pendingWindow.close).toHaveBeenCalledTimes(1);
  });

  it('closes the blank tab when redirecting the opened tab fails', async () => {
    const pendingWindow = createPendingWindow();
    pendingWindow.location.replace.mockImplementation(() => {
      throw new Error('navigation failed');
    });
    const openMock = vi.fn().mockReturnValue(pendingWindow);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(apiClient.post).mockResolvedValue(createLaunchResponse());
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { open: openMock });

    await expect(launchTimetablePortal()).rejects.toThrow(
      'Timetable portal tab could not be redirected. Try again.',
    );

    expect(openMock.mock.calls).toEqual([['about:blank', '_blank']]);
    expect(pendingWindow.close).toHaveBeenCalledTimes(1);
  });
});

describe('refreshTimetableAcademicData', () => {
  it('uses the authorized workspace-scoped refresh operation', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        status: 'SYNCHRONIZATION_PENDING',
        message: 'Academic data refresh has been queued.',
        last_successful_sync_at: null,
      },
    });

    await expect(refreshTimetableAcademicData()).resolves.toMatchObject({
      status: 'SYNCHRONIZATION_PENDING',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/plugins/timetable/integration/refresh/');
  });
});

import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notificationAPI } from '@/app/core/api/notifications';
import { useNotifications } from '@/app/core/hooks/useNotifications';
import { maybeShowBrowserNotification } from '@/app/core/lib/browserNotification';
import { queueNotificationSound } from '@/app/core/lib/notificationSound';
import {
  advanceWorkspaceGeneration,
  resetWorkspaceGenerationForTests,
} from '@/app/core/runtime/workspaceGeneration';
import type { Notification } from '@/app/core/types/notifications';

vi.mock('@/app/core/api/notifications', () => ({
  notificationAPI: {
    getAll: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

vi.mock('@/app/core/lib/browserNotification', () => ({
  maybeShowBrowserNotification: vi.fn(),
}));

vi.mock('@/app/core/lib/notificationSound', () => ({
  initializeNotificationSound: vi.fn(),
  queueNotificationSound: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function notification(id: number, title: string): Notification {
  return {
    id,
    notification_type: 'SESSION_REMINDER',
    priority: 'NORMAL',
    title,
    body: `${title} body`,
    entity_type: 'session',
    entity_id: id,
    is_read: false,
    read_at: null,
    created_at: '2026-07-16T10:00:00Z',
  };
}

describe('notification workspace isolation', () => {
  beforeEach(() => {
    resetWorkspaceGenerationForTests();
    vi.clearAllMocks();
  });

  it('clears workspace A immediately and discards its late response and side effects', async () => {
    const workspaceA = deferred<Notification[]>();
    const workspaceB = deferred<Notification[]>();
    vi.mocked(notificationAPI.getAll)
      .mockReturnValueOnce(workspaceA.promise)
      .mockReturnValueOnce(workspaceB.promise);

    function Harness() {
      const current = useNotifications();
      return createElement('notification-state', {
        count: current.unreadCount,
        ids: current.notifications.map((item) => item.id).join(','),
      });
    }

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(createElement(Harness));
    });
    expect(notificationAPI.getAll).toHaveBeenCalledTimes(1);

    await act(async () => {
      advanceWorkspaceGeneration('workspace-switch');
    });
    const notificationState = () => renderer!.root.find(
      (node) => String(node.type) === 'notification-state',
    );
    expect(notificationState().props).toMatchObject({
      count: 0,
      ids: '',
    });
    expect(notificationAPI.getAll).toHaveBeenCalledTimes(2);

    await act(async () => {
      workspaceA.resolve([notification(1, 'Workspace A')]);
      await workspaceA.promise;
    });
    expect(notificationState().props).toMatchObject({
      count: 0,
      ids: '',
    });
    expect(queueNotificationSound).not.toHaveBeenCalled();
    expect(maybeShowBrowserNotification).not.toHaveBeenCalled();

    await act(async () => {
      workspaceB.resolve([notification(2, 'Workspace B')]);
      await workspaceB.promise;
    });
    expect(notificationState().props).toMatchObject({
      count: 1,
      ids: '2',
    });
    renderer!.unmount();
  });
});

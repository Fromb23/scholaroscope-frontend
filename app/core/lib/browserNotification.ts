import { getNotificationSoundKey } from '@/app/core/lib/notificationUtils';
import type { Notification as AppNotification } from '@/app/core/types/notifications';

export function maybeShowBrowserNotification(notification: AppNotification): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    if (!('Notification' in window) || window.Notification.permission !== 'granted') {
        return;
    }

    if (document.visibilityState === 'visible') {
        return;
    }

    try {
        new window.Notification(notification.title, {
            body: notification.body || undefined,
            tag: getNotificationSoundKey(notification),
            silent: true,
        });
    } catch {
        // Browser notifications are best-effort only.
    }
}

import type { Notification } from '@/app/core/types/notifications';

function normalize(value?: string | null): string {
    return value?.trim().toUpperCase() ?? '';
}

export function getNotificationRevision(notification: Notification): string {
    return notification.updated_at ?? notification.created_at;
}

export function getNotificationSoundKey(notification: Notification): string {
    return `${notification.id}:${getNotificationRevision(notification)}`;
}

export function isSessionNotification(notification: Notification): boolean {
    if (normalize(notification.entity_type) === 'SESSION') {
        return true;
    }

    if (normalize(notification.notification_type).includes('SESSION')) {
        return true;
    }

    const content = `${notification.title} ${notification.body}`.toLowerCase();
    return /\b(session|lesson)\b/.test(content);
}

export function getNotificationRoute(notification: Notification): string | null {
    const entityType = normalize(notification.entity_type);
    const notificationType = normalize(notification.notification_type);

    if (!notification.entity_id) {
        return null;
    }

    if (entityType === 'SESSION') {
        return `/sessions/${notification.entity_id}`;
    }

    if (
        !entityType.includes('SUMMARY')
        && (
            notificationType.includes('SESSION')
            || entityType.includes('SESSION')
            || entityType.includes('LESSON')
        )
    ) {
        return `/sessions/${notification.entity_id}`;
    }

    return null;
}

'use client';

import { useEffect } from 'react';
import { registerNavBadgeReporter, useSetNavBadge } from '@/app/core/registry/navBadges';
import { useUnreadAnnouncements } from '@/app/plugins/announcements/hooks/useAnnouncements';

function AnnouncementsBadgeReporter() {
    const { count } = useUnreadAnnouncements();
    const set = useSetNavBadge();
    useEffect(() => { set('announcements', count); }, [count, set]);
    return null;
}

registerNavBadgeReporter(AnnouncementsBadgeReporter);

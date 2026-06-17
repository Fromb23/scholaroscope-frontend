'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { registerNavBadgeReporter, useSetNavBadge } from '@/app/core/registry/navBadges';
import { useUnreadAnnouncements } from '@/app/plugins/announcements/hooks/useAnnouncements';

function AnnouncementsBadgeReporter() {
    const { activeOrg, capabilities } = useAuth();
    const blocked = activeOrg?.org_type === 'PERSONAL'
        || capabilities.workspace_behavior === 'FREELANCE_TEACHER';
    const { count } = useUnreadAnnouncements({ enabled: !blocked });
    const set = useSetNavBadge();
    useEffect(() => { set('announcements', blocked ? 0 : count); }, [blocked, count, set]);
    return null;
}

registerNavBadgeReporter(AnnouncementsBadgeReporter);

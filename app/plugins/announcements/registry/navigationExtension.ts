import { Megaphone } from 'lucide-react';
import { registerPluginNavigationEntry } from '@/app/core/registry/pluginNavigation';
import { canUseAnnouncements } from '@/app/core/lib/workspaceGovernance';

registerPluginNavigationEntry({
    key: 'announcements-admin-nav',
    slot: 'admin.secondary.beforeSettings',
    priority: 10,
    resolve: ({ badges, orgType, workspaceBehavior, capabilities }) => {
        if (
            orgType === 'PERSONAL'
            || workspaceBehavior === 'FREELANCE_TEACHER'
            || !canUseAnnouncements(capabilities)
        ) {
            return null;
        }
        return {
            name: 'Announcements',
            href: '/announcements',
            icon: Megaphone,
            badge: badges['announcements'] ?? 0,
        };
    },
});

registerPluginNavigationEntry({
    key: 'announcements-instructor-nav',
    slot: 'instructor.secondary.beforeSubmitRequest',
    priority: 10,
    resolve: ({ badges, orgType, workspaceBehavior, capabilities }) => {
        if (
            orgType === 'PERSONAL'
            || workspaceBehavior === 'FREELANCE_TEACHER'
            || !canUseAnnouncements(capabilities)
        ) {
            return null;
        }
        return {
            name: 'Announcements',
            href: '/announcements',
            icon: Megaphone,
            badge: badges['announcements'] ?? 0,
        };
    },
});

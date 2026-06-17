import { Megaphone } from 'lucide-react';
import { registerPluginNavigationEntry } from '@/app/core/registry/pluginNavigation';

registerPluginNavigationEntry({
    key: 'announcements-superadmin-nav',
    slot: 'superadmin.primary.afterOrganizations',
    priority: 10,
    resolve: () => ({ name: 'Announcements', href: '/announcements', icon: Megaphone }),
});

registerPluginNavigationEntry({
    key: 'announcements-admin-nav',
    slot: 'admin.secondary.beforeSettings',
    priority: 10,
    resolve: ({ badges, orgType, workspaceBehavior }) => {
        if (orgType === 'PERSONAL' || workspaceBehavior === 'FREELANCE_TEACHER') {
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
    resolve: ({ badges, orgType, workspaceBehavior }) => {
        if (orgType === 'PERSONAL' || workspaceBehavior === 'FREELANCE_TEACHER') {
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

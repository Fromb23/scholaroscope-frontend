import { BookOpen, Plus } from 'lucide-react';
import { registerPluginNavigationEntry } from '@/app/core/registry/pluginNavigation';

const schemesNavItem = (label = 'Schemes of Work') => ({
    name: label,
    href: '/schemes',
    icon: BookOpen,
    children: [
        { name: label, href: '/schemes', icon: BookOpen },
        { name: 'Create Draft Scheme', href: '/schemes/new', icon: Plus },
    ],
});

registerPluginNavigationEntry({
    key: 'schemes-admin-nav',
    slot: 'admin.primary.afterDashboard',
    priority: 20,
    resolve: ({ hasPlugin, orgType, workspaceBehavior }) => {
        if (!hasPlugin('schemes')) return null;
        const label = orgType === 'PERSONAL' || workspaceBehavior === 'FREELANCE_TEACHER'
            ? 'My schemes of work'
            : 'Schemes of Work';
        return schemesNavItem(label);
    },
});

registerPluginNavigationEntry({
    key: 'schemes-instructor-nav',
    slot: 'instructor.primary.afterDashboard',
    priority: 20,
    resolve: ({ hasPlugin }) => (hasPlugin('schemes') ? schemesNavItem() : null),
});

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

const schemesViewOnlyNavItem = (label = 'Schemes of Work') => ({
    name: label,
    href: '/schemes',
    icon: BookOpen,
});

registerPluginNavigationEntry({
    key: 'schemes-admin-nav',
    slot: 'admin.primary.afterDashboard',
    priority: 20,
    resolve: ({ hasPlugin, orgType, workspaceBehavior, canTeach, isWorkspaceOwner }) => {
        if (!hasPlugin('schemes')) return null;
        if (
            canTeach
            && (orgType === 'PERSONAL' || workspaceBehavior === 'FREELANCE_TEACHER' || isWorkspaceOwner)
        ) {
            return schemesNavItem('My schemes of work');
        }
        return schemesViewOnlyNavItem('Schemes of Work');
    },
});

registerPluginNavigationEntry({
    key: 'schemes-instructor-nav',
    slot: 'instructor.primary.afterDashboard',
    priority: 20,
    resolve: ({ hasPlugin }) => (hasPlugin('schemes') ? schemesNavItem() : null),
});

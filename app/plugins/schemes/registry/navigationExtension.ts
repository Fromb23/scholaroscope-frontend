import { BookOpen, Plus } from 'lucide-react';
import { registerPluginNavigationEntry } from '@/app/core/registry/pluginNavigation';

const schemesNavItem = {
    name: 'Schemes of Work',
    href: '/schemes',
    icon: BookOpen,
    children: [
        { name: 'Schemes of Work', href: '/schemes', icon: BookOpen },
        { name: 'Create Draft Scheme', href: '/schemes/new', icon: Plus },
    ],
};

registerPluginNavigationEntry({
    key: 'schemes-admin-nav',
    slot: 'admin.primary.afterDashboard',
    priority: 20,
    resolve: ({ hasPlugin }) => (hasPlugin('schemes') ? schemesNavItem : null),
});

registerPluginNavigationEntry({
    key: 'schemes-instructor-nav',
    slot: 'instructor.primary.afterDashboard',
    priority: 20,
    resolve: ({ hasPlugin }) => (hasPlugin('schemes') ? schemesNavItem : null),
});

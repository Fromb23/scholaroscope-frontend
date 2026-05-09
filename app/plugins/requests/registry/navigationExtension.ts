import { Inbox } from 'lucide-react';
import { registerPluginNavigationEntry } from '@/app/core/registry/pluginNavigation';

registerPluginNavigationEntry({
    key: 'requests-admin-nav',
    slot: 'admin.primary.afterDashboard',
    priority: 10,
    resolve: () => ({ name: 'Pending Requests', href: '/requests', icon: Inbox, badge: 0 }),
});

registerPluginNavigationEntry({
    key: 'requests-instructor-nav',
    slot: 'instructor.primary.afterMySessions',
    priority: 10,
    resolve: () => ({ name: 'My Requests', href: '/requests', icon: Inbox, badge: 0 }),
});

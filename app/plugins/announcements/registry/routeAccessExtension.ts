import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'announcements-route-access',
    rules: [
        { pattern: /^\/announcements/, requiredAnyPermission: ['announcements.view', 'announcements.create', 'announcements.manage'] },
    ],
});

import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'announcements-route-access',
    rules: [
        { pattern: /^\/announcements/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    ],
});

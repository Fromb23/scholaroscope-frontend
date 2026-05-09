import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'cambridge-route-access',
    rules: [
        { pattern: /^\/cambridge/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    ],
});

import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'schemes-route-access',
    rules: [
        { pattern: /^\/schemes(\/.*)?$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    ],
});

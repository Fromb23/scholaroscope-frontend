import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'requests-route-access',
    rules: [
        { pattern: /^\/requests/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    ],
});

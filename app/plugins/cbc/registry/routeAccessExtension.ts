import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'cbc-route-access',
    rules: [
        { pattern: /^\/cbc\/authoring/, allowedRoles: ['SUPERADMIN'] },
        { pattern: /^\/cbc\/teaching/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
        { pattern: /^\/cbc\/progress/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
        { pattern: /^\/cbc\/browser/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    ],
});

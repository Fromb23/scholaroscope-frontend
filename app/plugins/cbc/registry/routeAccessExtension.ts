import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'cbc-route-access',
    rules: [
        { pattern: /^\/cbc\/authoring/, allowedRoles: [] },
        { pattern: /^\/cbc\/teaching/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
        { pattern: /^\/cbc\/progress/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
        { pattern: /^\/cbc\/assessment-results/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
        { pattern: /^\/cbc\/report-policies/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
        { pattern: /^\/cbc\/browser/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    ],
});

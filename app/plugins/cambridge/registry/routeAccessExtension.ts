import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'cambridge-route-access',
    rules: [
        { pattern: /^\/cambridge/, requiredAnyPermission: ['academic.curricula.view', 'academic.curricula.manage', 'lessons.view', 'reports.view'] },
    ],
});

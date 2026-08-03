import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'schemes-route-access',
    rules: [
        { pattern: /^\/schemes(\/.*)?$/, requiredAnyPermission: ['schemes.view', 'schemes.create', 'schemes.manage', 'schemes.approve'] },
    ],
});

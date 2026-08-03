import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'requests-route-access',
    rules: [
        { pattern: /^\/requests/, requiredAnyPermission: ['requests.view', 'requests.create', 'requests.review', 'requests.manage'] },
    ],
});

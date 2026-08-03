import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';

registerPluginRouteAccess({
    key: 'cbc-route-access',
    rules: [
        { pattern: /^\/cbc\/authoring/, requiredAnyPermission: ['academic.curricula.manage'] },
        { pattern: /^\/cbc\/teaching/, requiredCapability: 'can_teach' },
        { pattern: /^\/cbc\/progress/, requiredAnyPermission: ['reports.view', 'learners.view'] },
        { pattern: /^\/cbc\/assessment-results/, requiredAnyPermission: ['assessments.view', 'reports.view'] },
        { pattern: /^\/cbc\/report-policies/, requiredAnyPermission: ['reports.manage_policy'] },
        { pattern: /^\/cbc\/browser/, requiredAnyPermission: ['academic.curricula.view', 'academic.curricula.manage'] },
    ],
});

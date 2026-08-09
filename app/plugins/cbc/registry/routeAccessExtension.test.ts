import { describe, expect, it } from 'vitest';

import './routeAccessExtension';
import { getPluginRouteAccessRules } from '@/app/utils/pluginRouteAccess';

describe('CBC teaching route context boundary', () => {
    it('requires My Teaching and teaching capability for direct CBC Teaching access', () => {
        const rule = getPluginRouteAccessRules().find(item => item.pattern.test('/cbc/teaching'));

        expect(rule?.requiredContext).toBe('MY_TEACHING');
        expect(rule?.requiredCapability).toBe('can_teach');
    });
});

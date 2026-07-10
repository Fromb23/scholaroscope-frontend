import { Award, BarChart3, BookOpen, Target, TrendingUp } from 'lucide-react';
import { registerPluginNavigationEntry } from '@/app/core/registry/pluginNavigation';
import { canManageCbcReportPolicyAuthoring } from '@/app/plugins/cbc/components/reportPolicies/reportPolicyAuthoringAccess';

registerPluginNavigationEntry({
    key: 'cbc-admin-nav',
    slot: 'admin.primary.afterAssessments',
    priority: 10,
    resolve: ({ hasPlugin, hasCurriculumType, user, capabilities }) => {
        if (!hasPlugin('cbc') && !hasCurriculumType('CBE')) {
            return null;
        }
        const cbcReportPolicyChildren = canManageCbcReportPolicyAuthoring({
            user,
            capabilities,
            authoringMode: 'INSTITUTION_GOVERNANCE',
        })
            ? [{ name: 'Academic Policies', href: '/reports/policies/cbc', icon: Award }]
            : [];

        return {
            name: 'CBC Management',
            href: '/cbc/progress',
            icon: Award,
            children: [
                { name: 'Progress Tracking', href: '/cbc/progress', icon: TrendingUp },
                { name: 'CBC Results', href: '/cbc/assessment-results', icon: BarChart3 },
                ...cbcReportPolicyChildren,
                { name: 'Browser', href: '/cbc/browser', icon: BookOpen },
                { name: 'Teaching', href: '/cbc/teaching', icon: Target },
            ],
        };
    },
});

registerPluginNavigationEntry({
    key: 'cbc-instructor-nav',
    slot: 'instructor.primary.afterAssessments',
    priority: 10,
    resolve: ({ hasPlugin, hasCurriculumType, instructorAccess }) =>
        (hasPlugin('cbc') || hasCurriculumType('CBE')) && instructorAccess?.hasCurriculumAccess('CBC')
        ? ({
            name: 'CBC Teaching',
            href: '/cbc/teaching',
            icon: Award,
            children: [
                { name: 'My Lessons', href: '/cbc/teaching/sessions', icon: Target },
                { name: 'Learning Progress', href: '/cbc/progress', icon: TrendingUp },
                { name: 'CBC Results', href: '/cbc/assessment-results', icon: BarChart3 },
                { name: 'Browse Learning Goals', href: '/cbc/browser', icon: BookOpen },
            ],
        })
        : null,
});

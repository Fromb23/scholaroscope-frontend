import { Award, BarChart3, BookOpen, Layers, Target, TrendingUp } from 'lucide-react';
import { registerPluginNavigationEntry } from '@/app/core/registry/pluginNavigation';

registerPluginNavigationEntry({
    key: 'cbc-superadmin-authoring-nav',
    slot: 'superadmin.primary.afterPluginRegistry',
    priority: 10,
    resolve: () => ({
        name: 'Curriculum Authoring',
        href: '/cbc/authoring',
        icon: BookOpen,
        children: [
            { name: 'Overview', href: '/cbc/authoring', icon: BookOpen },
            { name: 'Strands', href: '/cbc/authoring/strands', icon: Layers },
        ],
    }),
});

registerPluginNavigationEntry({
    key: 'cbc-admin-nav',
    slot: 'admin.primary.afterAssessments',
    priority: 10,
    resolve: ({ hasPlugin }) => hasPlugin('cbc')
        ? ({
            name: 'CBC Management',
            href: '/cbc/progress',
            icon: Award,
            children: [
                { name: 'Progress Tracking', href: '/cbc/progress', icon: TrendingUp },
                { name: 'CBC Results', href: '/cbc/assessment-results', icon: BarChart3 },
                { name: 'Browser', href: '/cbc/browser', icon: BookOpen },
                { name: 'Teaching', href: '/cbc/teaching', icon: Target },
            ],
        })
        : null,
});

registerPluginNavigationEntry({
    key: 'cbc-instructor-nav',
    slot: 'instructor.primary.afterAssessments',
    priority: 10,
    resolve: ({ hasPlugin, instructorAccess }) => hasPlugin('cbc') && instructorAccess?.hasCurriculumAccess('CBC')
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

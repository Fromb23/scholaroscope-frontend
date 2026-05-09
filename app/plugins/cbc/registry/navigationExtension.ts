import { Award, BookOpen, Layers, Target, TrendingUp } from 'lucide-react';
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
                { name: 'My Sessions', href: '/cbc/teaching/sessions', icon: Target },
                { name: 'Progress View', href: '/cbc/progress', icon: TrendingUp },
                { name: 'Browse Outcomes', href: '/cbc/browser', icon: BookOpen },
            ],
        })
        : null,
});

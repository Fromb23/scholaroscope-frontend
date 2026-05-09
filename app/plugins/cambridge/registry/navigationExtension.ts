import { BarChart3, BookOpen, GraduationCap, Layers, Settings } from 'lucide-react';
import { registerPluginNavigationEntry } from '@/app/core/registry/pluginNavigation';

const cambridgeNavItem = {
    name: 'Cambridge Management',
    href: '/cambridge',
    icon: BookOpen,
    children: [
        { name: 'Dashboard', href: '/cambridge', icon: BookOpen },
        { name: 'Authoring', href: '/cambridge/authoring/programmes', icon: Layers },
        { name: 'Setup', href: '/cambridge/setup', icon: Settings },
        { name: 'Subjects', href: '/cambridge/subjects', icon: GraduationCap },
        { name: 'Progress', href: '/cambridge/progress', icon: BarChart3 },
    ],
};

registerPluginNavigationEntry({
    key: 'cambridge-admin-nav',
    slot: 'admin.primary.afterAssessments',
    priority: 20,
    resolve: ({ hasPlugin }) => hasPlugin('cambridge') ? cambridgeNavItem : null,
});

registerPluginNavigationEntry({
    key: 'cambridge-instructor-nav',
    slot: 'instructor.primary.afterAssessments',
    priority: 20,
    resolve: ({ hasPlugin, instructorAccess }) =>
        hasPlugin('cambridge') && instructorAccess?.hasCurriculumAccess('CAMBRIDGE') ? cambridgeNavItem : null,
});

import { CalendarDays } from 'lucide-react';

import { registerPluginNavigationEntry } from '@/app/core/registry/pluginNavigation';
import {
  canViewOwnTimetable,
  canViewWorkspaceTimetable,
} from '@/app/plugins/timetable/lib/access';

registerPluginNavigationEntry({
  key: 'timetable-workspace-nav',
  slot: 'admin.primary.afterDashboard',
  priority: 15,
  resolve: ({ capabilities }) => {
    if (!canViewWorkspaceTimetable(capabilities)) return null;
    return {
      name: 'Workspace Timetable',
      shortName: 'Timetable',
      href: '/timetable/workspace',
      icon: CalendarDays,
      mobilePriority: 3,
    };
  },
});

registerPluginNavigationEntry({
  key: 'timetable-my-nav',
  slot: 'instructor.primary.afterDashboard',
  priority: 15,
  resolve: ({ capabilities }) => {
    if (!canViewOwnTimetable(capabilities)) return null;
    return {
      name: 'My Timetable',
      shortName: 'Timetable',
      href: '/timetable/my',
      icon: CalendarDays,
      mobilePriority: 2,
    };
  },
});

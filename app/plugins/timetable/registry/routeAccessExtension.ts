import { registerPluginRouteAccess } from '@/app/utils/pluginRouteAccess';
import {
  canPrintOwnTimetable,
  canPrintWorkspaceTimetable,
  canViewOwnTimetable,
  canViewWorkspaceTimetable,
} from '@/app/plugins/timetable/lib/access';

registerPluginRouteAccess({
  key: 'timetable-route-access',
  rules: [
    {
      pattern: /^\/timetable\/my\/print$/,
      isAllowed: ({ capabilities }) => canPrintOwnTimetable(capabilities),
    },
    {
      pattern: /^\/timetable\/workspace\/print$/,
      isAllowed: ({ capabilities }) => canPrintWorkspaceTimetable(capabilities),
    },
    {
      pattern: /^\/timetable\/my$/,
      isAllowed: ({ capabilities }) => canViewOwnTimetable(capabilities),
    },
    {
      pattern: /^\/timetable\/workspace$/,
      isAllowed: ({ capabilities }) => canViewWorkspaceTimetable(capabilities),
    },
    {
      pattern: /^\/timetable$/,
      isAllowed: ({ capabilities }) => (
        canViewOwnTimetable(capabilities)
        || canViewWorkspaceTimetable(capabilities)
      ),
    },
  ],
});

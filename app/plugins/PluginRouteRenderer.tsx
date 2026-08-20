'use client';

import {
  MyTimetablePage,
  TimetableLandingPage,
  WorkspaceTimetablePage,
} from '@/app/plugins/timetable/components/TimetableComponents';

type PluginRouteKey =
  | 'timetable.landing'
  | 'timetable.my'
  | 'timetable.my.print'
  | 'timetable.workspace'
  | 'timetable.workspace.print';

export function PluginRouteRenderer({ routeKey }: { routeKey: PluginRouteKey }) {
  switch (routeKey) {
    case 'timetable.landing':
      return <TimetableLandingPage />;
    case 'timetable.my':
      return <MyTimetablePage />;
    case 'timetable.my.print':
      return <MyTimetablePage printable />;
    case 'timetable.workspace':
      return <WorkspaceTimetablePage />;
    case 'timetable.workspace.print':
      return <WorkspaceTimetablePage printable />;
    default:
      return null;
  }
}

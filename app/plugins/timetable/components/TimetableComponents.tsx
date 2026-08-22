'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ExternalLink, Printer, RefreshCw } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAuth } from '@/app/context/AuthContext';
import {
  getOwnTimetable,
  getOwnTimetableChanges,
  getTimetableIntegrationStatus,
  getWorkspaceTimetable,
  launchTimetablePortal,
  refreshTimetableAcademicData,
  type TimetableEntry,
  type TimetableProjectionResponse,
} from '@/app/plugins/timetable/api/timetable';
import {
  canLaunchTimetableManagement,
  canManageTimetable,
  canPrintOwnTimetable,
  canPrintWorkspaceTimetable,
  canViewOwnTimetable,
  canViewWorkspaceTimetable,
} from '@/app/plugins/timetable/lib/access';

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function displayDate(value?: string | null): string {
  if (!value) return 'Not specified';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function displayDateTime(value?: string | null): string {
  if (!value) return 'Not specified';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function dayLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function StateCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <Card className="mx-auto max-w-2xl text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <CalendarDays className="h-6 w-6 text-gray-500" />
      </div>
      <h1 className="text-xl font-semibold theme-text">{title}</h1>
      <p className="mt-2 text-sm theme-muted">{message}</p>
    </Card>
  );
}

function ProjectionSummary({
  data,
  title,
}: {
  data: TimetableProjectionResponse;
  title: string;
}) {
  const projection = data.projection;
  if (!projection) return null;
  return (
    <Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium theme-muted">{projection.workspace_name}</p>
          <h1 className="mt-1 text-2xl font-semibold theme-text">{title}</h1>
          <p className="mt-2 text-sm theme-muted">
            {projection.academic_year_label || 'Academic year not specified'} · {projection.term_label || 'Term not specified'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Published</Badge>
          {data.printable ? <Badge variant="default">Print view</Badge> : null}
        </div>
      </div>
      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-4">
        <div>
          <dt className="theme-muted">Version</dt>
          <dd className="font-medium theme-text">{projection.version_label || projection.version_uuid.slice(0, 8)}</dd>
        </div>
        <div>
          <dt className="theme-muted">Effective from</dt>
          <dd className="font-medium theme-text">{displayDate(projection.effective_from)}</dd>
        </div>
        <div>
          <dt className="theme-muted">Published</dt>
          <dd className="font-medium theme-text">{displayDateTime(projection.published_at)}</dd>
        </div>
        <div>
          <dt className="theme-muted">Lessons</dt>
          <dd className="font-medium theme-text">{data.entries.length}</dd>
        </div>
      </dl>
    </Card>
  );
}

function WeeklyGrid({ entries }: { entries: TimetableEntry[] }) {
  const grouped = useMemo(() => {
    const result = new Map<string, TimetableEntry[]>();
    days.forEach((day) => result.set(day, []));
    entries.forEach((entry) => {
      const key = entry.day_of_week.toUpperCase();
      result.set(key, [...(result.get(key) ?? []), entry]);
    });
    return result;
  }, [entries]);

  if (!entries.length) {
    return (
      <StateCard
        title="No scheduled lessons in this projection"
        message="The current published timetable does not contain entries for this view."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5 print:grid-cols-5">
      {days.map((day) => {
        const dayEntries = (grouped.get(day) ?? []).sort((left, right) => left.start_time.localeCompare(right.start_time));
        if (!dayEntries.length && ['SATURDAY', 'SUNDAY'].includes(day)) return null;
        return (
          <Card key={day} className="p-4">
            <h2 className="font-semibold theme-text">{dayLabel(day)}</h2>
            <div className="mt-3 space-y-3">
              {dayEntries.length ? dayEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-[color:var(--color-border)] p-3">
                  <p className="text-sm font-semibold theme-text">{entry.start_time}–{entry.end_time}</p>
                  <p className="mt-1 text-sm theme-text">{entry.subject_name || 'Subject not specified'}</p>
                  <p className="text-xs theme-muted">{entry.cohort_name || 'Cohort not specified'}</p>
                  {entry.teacher_name ? <p className="text-xs theme-muted">{entry.teacher_name}</p> : null}
                  {entry.room_name ? <p className="mt-1 text-xs theme-muted">Room: {entry.room_name}</p> : null}
                </div>
              )) : (
                <p className="text-sm theme-muted">No lessons</p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TimetableShell({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {actions ? <div className="flex flex-wrap justify-end gap-2 print:hidden">{actions}</div> : null}
      {children}
    </div>
  );
}

export function TimetableLandingPage() {
  const router = useRouter();
  const { capabilities, loading } = useAuth();
  const canOwn = canViewOwnTimetable(capabilities);
  const canWorkspace = canViewWorkspaceTimetable(capabilities);

  useEffect(() => {
    if (loading) return;
    if (canOwn && !canWorkspace) router.replace('/timetable/my');
    if (canWorkspace && !canOwn) router.replace('/timetable/workspace');
  }, [canOwn, canWorkspace, loading, router]);

  if (loading) return <LoadingSpinner />;
  if (!canOwn && !canWorkspace) {
    return (
      <StateCard
        title="Timetable unavailable"
        message="This workspace or your current permissions do not allow timetable access."
      />
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {canOwn ? (
        <Card>
          <h1 className="text-xl font-semibold theme-text">My Timetable</h1>
          <p className="mt-2 text-sm theme-muted">View your published teaching schedule.</p>
          <Link className="mt-4 inline-flex" href="/timetable/my">
            <Button>Open my timetable</Button>
          </Link>
        </Card>
      ) : null}
      {canWorkspace ? (
        <Card>
          <h1 className="text-xl font-semibold theme-text">Workspace Timetable</h1>
          <p className="mt-2 text-sm theme-muted">View the published timetable for the workspace.</p>
          <Link className="mt-4 inline-flex" href="/timetable/workspace">
            <Button>Open workspace timetable</Button>
          </Link>
        </Card>
      ) : null}
    </div>
  );
}

export function MyTimetablePage({ printable = false }: { printable?: boolean }) {
  const { capabilities, workspaceGeneration } = useAuth();
  const allowed = printable ? canPrintOwnTimetable(capabilities) : canViewOwnTimetable(capabilities);
  const timetable = useQuery({
    queryKey: ['timetable', 'own', printable, workspaceGeneration],
    queryFn: () => getOwnTimetable(printable),
    enabled: allowed,
  });
  const changes = useQuery({
    queryKey: ['timetable', 'own-changes', workspaceGeneration],
    queryFn: getOwnTimetableChanges,
    enabled: allowed && !printable,
  });

  if (!allowed) {
    return (
      <StateCard
        title="Permission denied"
        message="Your current workspace permissions do not allow this timetable view."
      />
    );
  }
  if (timetable.isLoading) return <LoadingSpinner />;
  if (timetable.isError) {
    return (
      <StateCard
        title="Timetable unavailable"
        message="The timetable projection could not be loaded right now."
      />
    );
  }
  if (!timetable.data || timetable.data.status === 'NO_PUBLISHED_TIMETABLE') {
    return (
      <StateCard
        title="No published timetable"
        message="Your workspace has not published a timetable yet."
      />
    );
  }

  return (
    <TimetableShell
      actions={!printable && (
        <Link href="/timetable/my/print">
          <Button variant="secondary"><Printer className="h-4 w-4" /> Print</Button>
        </Link>
      )}
    >
      <ProjectionSummary data={timetable.data} title="My Timetable" />
      <WeeklyGrid entries={timetable.data.entries} />
      {!printable ? (
        <Card>
          <h2 className="text-lg font-semibold theme-text">Upcoming changes</h2>
          {changes.data?.changes.length ? (
            <ul className="mt-3 space-y-2 text-sm theme-muted">
              {changes.data.changes.map((change, index) => (
                <li key={`${change.created_at}-${index}`}>
                  <Badge variant="info">{change.classification}</Badge>
                  <span className="ml-2">{displayDateTime(change.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm theme-muted">No upcoming timetable changes are recorded for you.</p>
          )}
        </Card>
      ) : null}
    </TimetableShell>
  );
}

function WorkspaceFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [teacher, setTeacher] = useState(searchParams.get('teacher') ?? '');
  const [cohort, setCohort] = useState(searchParams.get('cohort') ?? '');
  const [subject, setSubject] = useState(searchParams.get('subject') ?? '');
  const [day, setDay] = useState(searchParams.get('day') ?? '');
  const [room, setRoom] = useState(searchParams.get('room') ?? '');

  function apply() {
    const params = new URLSearchParams();
    if (teacher) params.set('teacher', teacher);
    if (cohort) params.set('cohort', cohort);
    if (subject) params.set('subject', subject);
    if (day) params.set('day', day);
    if (room) params.set('room', room);
    router.push(`/timetable/workspace${params.size ? `?${params}` : ''}`);
  }

  return (
    <Card className="print:hidden">
      <h2 className="text-lg font-semibold theme-text">Filters</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <input className="theme-input rounded-lg px-3 py-2 text-sm" placeholder="Teacher ID" value={teacher} onChange={(event) => setTeacher(event.target.value)} />
        <input className="theme-input rounded-lg px-3 py-2 text-sm" placeholder="Cohort ID" value={cohort} onChange={(event) => setCohort(event.target.value)} />
        <input className="theme-input rounded-lg px-3 py-2 text-sm" placeholder="Subject ID" value={subject} onChange={(event) => setSubject(event.target.value)} />
        <select className="theme-input rounded-lg px-3 py-2 text-sm" value={day} onChange={(event) => setDay(event.target.value)}>
          <option value="">Any day</option>
          {days.map((value) => <option key={value} value={value}>{dayLabel(value)}</option>)}
        </select>
        <input className="theme-input rounded-lg px-3 py-2 text-sm" placeholder="Room" value={room} onChange={(event) => setRoom(event.target.value)} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="button" onClick={apply}>Apply filters</Button>
        <Link href="/timetable/workspace"><Button type="button" variant="secondary">Clear</Button></Link>
      </div>
    </Card>
  );
}

export function WorkspaceTimetablePage({ printable = false }: { printable?: boolean }) {
  const searchParams = useSearchParams();
  const { capabilities, workspaceGeneration } = useAuth();
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const allowed = printable ? canPrintWorkspaceTimetable(capabilities) : canViewWorkspaceTimetable(capabilities);
  const statusQuery = useQuery({
    queryKey: ['timetable', 'integration-status', workspaceGeneration],
    queryFn: getTimetableIntegrationStatus,
    enabled: allowed,
  });
  const timetable = useQuery({
    queryKey: ['timetable', 'workspace', printable, searchParams.toString(), workspaceGeneration],
    queryFn: () => getWorkspaceTimetable(searchParams, printable),
    enabled: allowed,
  });
  const ready = statusQuery.data?.integration.ready === true;
  const canManage = canLaunchTimetableManagement(capabilities, ready);
  const canRefresh = canManageTimetable(capabilities);
  const integrationMessage = ready
    ? 'Academic data synchronization is ready.'
    : statusQuery.data?.integration.reconciliation_required
      ? 'Academic data may be out of date. Refresh this workspace before managing the timetable.'
      : statusQuery.data?.integration.provisioning_state === 'FAILED'
        ? 'Academic data synchronization failed. Refresh this workspace or contact support if it continues.'
        : 'Academic data synchronization is still being prepared.';

  async function launchPortal() {
    setLaunching(true);
    setLaunchError(null);
  try {
      await launchTimetablePortal();
      setLaunching(false);
    } catch {
      setLaunchError('Timetable management could not be launched. Check integration readiness and your permission.');
      setLaunching(false);
    }
  }

  async function refreshAcademicData() {
    setRefreshing(true);
    setLaunchError(null);
    try {
      const result = await refreshTimetableAcademicData();
      setRefreshMessage(result.message);
      await statusQuery.refetch();
    } catch {
      setLaunchError('Academic data refresh could not be queued. Try again.');
    } finally {
      setRefreshing(false);
    }
  }

  if (!allowed) {
    return (
      <StateCard
        title="Permission denied"
        message="Your current workspace permissions do not allow workspace timetable access."
      />
    );
  }
  if (timetable.isLoading || statusQuery.isLoading) return <LoadingSpinner />;
  if (timetable.isError) {
    return (
      <StateCard
        title="Timetable unavailable"
        message="The workspace timetable projection could not be loaded right now."
      />
    );
  }
  if (!timetable.data || timetable.data.status === 'NO_PUBLISHED_TIMETABLE') {
    return (
      <TimetableShell
        actions={<>{canRefresh && !ready ? <Button variant="secondary" onClick={refreshAcademicData} disabled={refreshing}><RefreshCw className="h-4 w-4" /> {refreshing ? 'Refreshing…' : 'Refresh academic data'}</Button> : null}{canManage ? <Button onClick={launchPortal} disabled={launching}>Manage Timetable <ExternalLink className="h-4 w-4" /></Button> : null}</>}
      >
        <StateCard
          title="No published timetable"
          message={`This workspace has not published a timetable yet. ${integrationMessage}`}
        />
        {refreshMessage ? <p className="text-sm text-green-700">{refreshMessage}</p> : null}
        {launchError ? <p className="text-sm text-red-600">{launchError}</p> : null}
      </TimetableShell>
    );
  }

  return (
    <TimetableShell
      actions={!printable && (
        <>
          <Link href={`/timetable/workspace/print${searchParams.toString() ? `?${searchParams}` : ''}`}>
            <Button variant="secondary"><Printer className="h-4 w-4" /> Print</Button>
          </Link>
          {canManage ? (
            <Button onClick={launchPortal} disabled={launching}>
              Manage Timetable <ExternalLink className="h-4 w-4" />
            </Button>
          ) : null}
          {canRefresh && !ready ? <Button variant="secondary" onClick={refreshAcademicData} disabled={refreshing}><RefreshCw className="h-4 w-4" /> {refreshing ? 'Refreshing…' : 'Refresh academic data'}</Button> : null}
        </>
      )}
    >
      <ProjectionSummary data={timetable.data} title="Workspace Timetable" />
      {!printable ? (
        <Card>
          <div className="flex flex-wrap gap-2"><Badge variant={ready ? 'success' : 'warning'}>{ready ? 'Academic data ready' : 'Academic data needs attention'}</Badge></div>
          <p className="mt-3 text-sm theme-muted">{integrationMessage}</p>
          {refreshMessage ? <p className="mt-3 text-sm text-green-700">{refreshMessage}</p> : null}
          {launchError ? <p className="mt-3 text-sm text-red-600">{launchError}</p> : null}
        </Card>
      ) : null}
      {!printable ? <WorkspaceFilters /> : null}
      <WeeklyGrid entries={timetable.data.entries} />
    </TimetableShell>
  );
}

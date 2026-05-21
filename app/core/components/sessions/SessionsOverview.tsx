'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    Layers,
    MapPin,
    Plus,
    Users,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useCohortSessions, useSessions, useTodaySessions } from '@/app/core/hooks/useSessions';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { groupBy } from '@/app/utils/groupBy';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { DesktopOnly } from '@/app/core/components/DesktopOnly';
import { useAuth } from '@/app/context/AuthContext';
import type { Session } from '@/app/core/types/session';

const SESSION_TYPES = [
    { value: '', label: 'All Types' },
    { value: 'LESSON', label: 'Lesson' },
    { value: 'PRACTICAL', label: 'Practical' },
    { value: 'PROJECT', label: 'Project' },
    { value: 'EXAM', label: 'Exam' },
    { value: 'FIELD_TRIP', label: 'Field Trip' },
    { value: 'ASSEMBLY', label: 'Assembly' },
    { value: 'OTHER', label: 'Other' },
];

function parseCohortId(rawValue: string | null) {
    if (!rawValue) return null;
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function sortSessionsByDate(sessions: Session[]) {
    return [...sessions].sort((left, right) => {
        const leftTimestamp = new Date(`${left.session_date}T${left.start_time ?? '00:00:00'}`).getTime();
        const rightTimestamp = new Date(`${right.session_date}T${right.start_time ?? '00:00:00'}`).getTime();
        return rightTimestamp - leftTimestamp;
    });
}

function formatSessionDate(sessionDate: string) {
    return new Date(sessionDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function getSessionTimeLabel(session: Session) {
    if (session.start_time && session.end_time) {
        return `${session.start_time} - ${session.end_time}`;
    }

    return session.start_time ?? session.end_time ?? 'Time not set';
}

function getAttendanceColor(percentage: number): 'success' | 'warning' | 'danger' {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'danger';
}

function getSessionInstructorLabel(session: Session) {
    return session.created_by_name?.trim()
        || session.created_by_email?.trim()
        || session.created_by?.trim()
        || 'Unknown instructor';
}

function SessionLifecycleHint({ session }: { session: Session }) {
    if (session.schedule_state === 'SCHEDULED_OVERDUE') {
        return <Badge variant="orange" size="sm">Missed / overdue</Badge>;
    }

    if (session.schedule_state === 'IN_PROGRESS_OVERDUE') {
        return <Badge variant="red" size="sm">Needs completion</Badge>;
    }

    return null;
}

function SessionInstructor({
    session,
    className = '',
    linkClassName = '',
}: {
    session: Session;
    className?: string;
    linkClassName?: string;
}) {
    const label = getSessionInstructorLabel(session);

    if (typeof session.created_by_id === 'number') {
        return (
            <Link
                href={`/admin/instructors/${session.created_by_id}/progress`}
                className={linkClassName || `theme-link hover:underline ${className}`.trim()}
            >
                {label}
            </Link>
        );
    }

    return <span className={className}>{label}</span>;
}

function CohortSessionsTable({
    sessions,
}: {
    sessions: Session[];
}) {
    const router = useRouter();

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[860px]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Instructor</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>Attendance</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sessions.map((session) => {
                            const { total, present } = session.attendance_count;
                            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

                            return (
                                <TableRow key={session.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="theme-info-surface shrink-0 rounded-lg p-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="whitespace-nowrap text-sm font-medium theme-text">
                                                    {formatSessionDate(session.session_date)}
                                                </div>
                                                <div className="whitespace-nowrap text-xs theme-muted">
                                                    {getSessionTimeLabel(session)}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-medium theme-text">
                                            {session.title || session.subject_name}
                                        </div>
                                        <div className="text-xs theme-muted">
                                            {session.subject_name}
                                            {session.subject_code ? ` · ${session.subject_code}` : ''}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <SessionInstructor
                                            session={session}
                                            className="text-sm theme-text"
                                            linkClassName="text-sm theme-link hover:underline"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="blue">{session.session_type_display}</Badge>
                                            <SessionLifecycleHint session={session} />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 whitespace-nowrap text-sm theme-muted">
                                            <MapPin className="h-3.5 w-3.5 theme-subtle shrink-0" />
                                            {session.venue || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <div className="text-sm font-medium theme-text">
                                                    {present}/{total}
                                                </div>
                                                <Badge variant={getAttendanceColor(percentage)} size="sm">
                                                    {percentage}%
                                                </Badge>
                                            </div>
                                            {percentage === 100 && total > 0 ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => router.push(`/sessions/${session.id}`)}
                                        >
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function CohortSessionsCards({
    sessions,
}: {
    sessions: Session[];
}) {
    return (
        <div className="space-y-3 md:hidden">
            {sessions.map((session) => {
                const { total, present } = session.attendance_count;
                const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

                return (
                    <Card key={session.id} className="p-4">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-sm font-semibold theme-text">
                                        {session.title || session.subject_name}
                                    </h2>
                                    <Badge variant="blue" size="sm">{session.session_type_display}</Badge>
                                    <SessionLifecycleHint session={session} />
                                </div>
                                <p className="text-xs theme-muted">
                                    {session.subject_name}
                                    {session.subject_code ? ` · ${session.subject_code}` : ''}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-sm theme-muted">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 theme-subtle shrink-0" />
                                    <span>{formatSessionDate(session.session_date)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 theme-subtle shrink-0" />
                                    <span>{getSessionTimeLabel(session)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 theme-subtle shrink-0" />
                                    <SessionInstructor
                                        session={session}
                                        className="theme-text"
                                        linkClassName="theme-link hover:underline"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 theme-subtle shrink-0" />
                                    <span>{session.venue || '-'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium theme-text">
                                        {present}/{total}
                                    </div>
                                    <Badge variant={getAttendanceColor(percentage)} size="sm">
                                        {percentage}%
                                    </Badge>
                                </div>
                                <Link href={`/sessions/${session.id}`}>
                                    <Button size="sm">View</Button>
                                </Link>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}

function SessionWorkspaceView() {
    const router = useRouter();
    const { activeRole } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const [selectedTerm, setSelectedTerm] = useState<number | undefined>();
    const [selectedType, setSelectedType] = useState<string | undefined>();
    const { sessions, loading, error, refetch } = useSessions({
        term: selectedTerm,
        session_type: selectedType,
    });
    const { sessions: todaySessions } = useTodaySessions();
    const { terms } = useTerms();
    const { cohorts } = useCohorts();

    const totalSessions = sessions.length;
    const todayCount = todaySessions.length;
    const mergedSessionsCount = sessions.filter((session) => (
        session.linked_cohorts && session.linked_cohorts.length > 1
    )).length;
    const avgAttendance = sessions.length > 0
        ? sessions.reduce((sum, session) => {
            const total = session.attendance_count.total;
            const present = session.attendance_count.present;
            return sum + (total > 0 ? (present / total) * 100 : 0);
        }, 0) / sessions.length
        : 0;

    const grouped = useMemo(() => (
        groupBy(sessions, {
            keyFn: (session) => session.cohort_id,
            labelFn: (session) => `${session.cohort_name} · ${session.cohort_level}`,
        })
    ), [sessions]);

    const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

    useEffect(() => {
        setCollapsedGroups(new Set(Array.from(grouped.keys())));
    }, [grouped]);

    const toggleGroup = (cohortId: number) => {
        setCollapsedGroups((previous) => {
            const next = new Set(previous);
            if (next.has(cohortId)) {
                next.delete(cohortId);
            } else {
                next.add(cohortId);
            }
            return next;
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-3">
                <div>
                    <h1 className="text-2xl font-semibold theme-text">
                        {isInstructor ? 'My Lessons' : 'Scheduled Lessons'}
                    </h1>
                    <p className="mt-1 text-sm theme-muted">
                        {isInstructor
                            ? 'Track your lessons, attendance, and day-to-day teaching flow.'
                            : 'Review scheduled lessons, attendance, and cohort lesson history from one workspace.'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    {!isInstructor ? (
                        <Link href="/sessions/today">
                            <Button variant="primary" size="sm">
                                <Clock className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Today&apos;s </span>Sessions
                            </Button>
                        </Link>
                    ) : null}
                    <Link href="/lesson-plans/new">
                        <Button size="sm">
                            <Plus className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Plan a lesson</span>
                        </Button>
                    </Link>
                </div>
            </div>

            <DesktopOnly>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatsCard title={isInstructor ? 'Total Lessons' : 'Scheduled Lessons'} value={totalSessions} icon={Calendar} color="blue" />
                    <StatsCard title="Today's Lessons" value={todayCount} icon={Clock} color="green" />
                    <StatsCard title={isInstructor ? 'Combined Lessons' : 'Combined Lessons'} value={mergedSessionsCount} icon={Layers} color="purple" />
                    <StatsCard title="Avg Attendance" value={`${avgAttendance.toFixed(1)}%`} icon={Users} color="orange" />
                </div>
            </DesktopOnly>

            {todaySessions.length > 0 ? (
                <Card>
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-semibold theme-text">
                                Today&apos;s Lessons
                            </h2>
                            {!isInstructor ? (
                                <Link href="/sessions/today">
                                    <Button variant="ghost" size="sm">View All</Button>
                                </Link>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            {todaySessions.slice(0, 3).map((session) => {
                                const isMerged = session.linked_cohorts && session.linked_cohorts.length > 1;

                                return (
                                    <div key={session.id} className="flex items-center gap-3 border-b py-2 last:border-0 theme-border">
                                        <div className="text-center shrink-0 w-14">
                                            <div className="text-xs font-medium theme-text">{session.start_time}</div>
                                            <div className="text-xs theme-subtle">{session.end_time}</div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 truncate text-sm font-medium theme-text">
                                                {session.subject_name}
                                                {isMerged ? (
                                                    <Badge variant="purple" size="sm">
                                                        <Layers className="w-3 h-3 mr-1" />
                                                        {session.linked_cohorts.length}
                                                    </Badge>
                                                ) : null}
                                                <SessionLifecycleHint session={session} />
                                            </div>
                                            <div className="truncate text-xs theme-muted">
                                                {isMerged
                                                    ? session.linked_cohorts.map((cohort) => cohort.cohort_name).join(', ')
                                                    : session.cohort_name}
                                                {session.venue ? ` · ${session.venue}` : ''}
                                            </div>
                                        </div>
                                        <Link href={`/sessions/${session.id}`} className="shrink-0">
                                            <Button variant="primary" size="sm">
                                                <span className="hidden sm:inline">Mark Attendance</span>
                                                <span className="sm:hidden">Mark</span>
                                            </Button>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            ) : null}

            <Card>
                <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Select
                            label=""
                            value={selectedTerm?.toString() || ''}
                            onChange={(event) => setSelectedTerm(event.target.value ? Number(event.target.value) : undefined)}
                            options={[
                                { value: '', label: 'All Terms' },
                                ...terms.map((term) => ({ value: String(term.id), label: term.name })),
                            ]}
                        />
                        <Select
                            label=""
                            value=""
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                router.push(nextValue ? `/sessions?cohort=${nextValue}` : '/sessions');
                            }}
                            options={[
                                { value: '', label: 'Cohort History' },
                                ...cohorts.map((cohort) => ({
                                    value: String(cohort.id),
                                    label: `${cohort.name} - ${cohort.level}`,
                                })),
                            ]}
                        />
                        <Select
                            label=""
                            value={selectedType || ''}
                            onChange={(event) => setSelectedType(event.target.value || undefined)}
                            options={SESSION_TYPES}
                        />
                    </div>
                </div>
            </Card>

            {error ? (
                <ErrorState message={error} onRetry={refetch} />
            ) : loading ? (
                <div className="py-12 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-2 theme-muted">Loading sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 theme-subtle" />
                        <h3 className="mt-2 text-sm font-medium theme-text">No sessions found</h3>
                        <p className="mt-1 text-sm theme-muted">
                            {selectedTerm || selectedType
                                ? 'Try adjusting your filters'
                                : 'Get started by planning a lesson'}
                        </p>
                        {!selectedTerm && !selectedType ? (
                            <Link href="/lesson-plans/new">
                                <Button className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" />Plan a lesson
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {Array.from(grouped.entries()).map(([cohortId, group]) => {
                        const isCollapsed = collapsedGroups.has(cohortId);
                        const groupTotal = group.items.reduce((sum, session) => sum + session.attendance_count.total, 0);
                        const groupPresent = group.items.reduce((sum, session) => sum + session.attendance_count.present, 0);
                        const groupPercentage = groupTotal > 0 ? Math.round((groupPresent / groupTotal) * 100) : 0;

                        return (
                            <Card key={`group-${cohortId}`} className="overflow-hidden">
                                <div
                                    onClick={() => toggleGroup(cohortId)}
                                    className="theme-surface-muted theme-hover-surface cursor-pointer select-none border-b px-4 py-3 transition-colors theme-border"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="theme-surface-elevated shrink-0 rounded-lg border p-1.5 shadow-sm theme-border">
                                            {isCollapsed
                                                ? <ChevronRight className="h-4 w-4 text-blue-600" />
                                                : <ChevronDown className="h-4 w-4 text-blue-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="truncate text-sm font-semibold theme-text">
                                                    {group.label}
                                                </h3>
                                                <Badge variant="blue" size="sm">
                                                    {group.items.length} session{group.items.length !== 1 ? 's' : ''}
                                                </Badge>
                                            </div>
                                            <p className="mt-0.5 text-xs theme-muted">
                                                {groupPresent}/{groupTotal} present ·{' '}
                                                <span className={groupPercentage >= 80 ? 'text-green-600' : groupPercentage >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                                                    {groupPercentage}%
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {!isCollapsed ? (
                                    <div className="theme-surface overflow-x-auto">
                                        <div className="min-w-[640px]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date & Time</TableHead>
                                                        <TableHead>Subject</TableHead>
                                                        <TableHead>Cohorts</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Venue</TableHead>
                                                        <TableHead>Attendance</TableHead>
                                                        <TableHead>Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {group.items.map((session) => {
                                                        const { total, present } = session.attendance_count;
                                                        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
                                                        const isMerged = session.linked_cohorts && session.linked_cohorts.length > 1;

                                                        return (
                                                            <TableRow
                                                                key={session.id}
                                                                onClick={() => router.push(`/sessions/${session.id}`)}
                                                                className="cursor-pointer transition-colors theme-hover-surface"
                                                            >
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="theme-info-surface shrink-0 rounded-lg p-1.5">
                                                                            <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="whitespace-nowrap text-sm font-medium theme-text">
                                                                                {formatSessionDate(session.session_date)}
                                                                            </div>
                                                                            <div className="whitespace-nowrap text-xs theme-muted">
                                                                                {getSessionTimeLabel(session)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="whitespace-nowrap text-sm font-medium theme-text">
                                                                        {session.subject_name}
                                                                    </div>
                                                                    <div className="text-xs theme-muted">{session.subject_code}</div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {isMerged ? (
                                                                        <div>
                                                                            <Badge variant="purple" size="sm">
                                                                                <Layers className="w-3 h-3 mr-1" />
                                                                                {session.linked_cohorts.length} cohorts
                                                                            </Badge>
                                                                            <div className="mt-1 whitespace-nowrap text-xs theme-muted">
                                                                                {session.linked_cohorts.slice(0, 2).map((cohort) => cohort.cohort_name).join(', ')}
                                                                                {session.linked_cohorts.length > 2 ? ` +${session.linked_cohorts.length - 2}` : ''}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div>
                                                                            <div className="whitespace-nowrap text-sm font-medium theme-text">{session.cohort_name}</div>
                                                                            <div className="text-xs theme-muted">{session.cohort_level}</div>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="blue">{session.session_type_display}</Badge>
                                                                        <SessionLifecycleHint session={session} />
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-1 whitespace-nowrap text-sm theme-muted">
                                                                        <MapPin className="h-3.5 w-3.5 theme-subtle shrink-0" />
                                                                        {session.venue || '-'}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <div>
                                                                            <div className="text-sm font-medium theme-text">{present}/{total}</div>
                                                                            <Badge variant={getAttendanceColor(percentage)} size="sm">{percentage}%</Badge>
                                                                        </div>
                                                                        {percentage === 100 ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : null}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Button
                                                                        variant="primary"
                                                                        size="sm"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            router.push(`/sessions/${session.id}`);
                                                                        }}
                                                                    >
                                                                        View
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                ) : null}
                            </Card>
                        );
                    })}
                </div>
            )}

            {sessions.length > 0 ? (
                <p className="text-sm theme-muted">
                    Showing <span className="font-medium">{sessions.length}</span> sessions across{' '}
                    <span className="font-medium">{grouped.size}</span> cohort{grouped.size !== 1 ? 's' : ''}
                    {mergedSessionsCount > 0 ? <span className="ml-2 text-purple-600">· {mergedSessionsCount} merged</span> : null}
                </p>
            ) : null}
        </div>
    );
}

function CohortSessionsView({
    cohortId,
}: {
    cohortId: number;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeRole } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const [selectedTerm, setSelectedTerm] = useState<number | undefined>();
    const [selectedType, setSelectedType] = useState<string | undefined>();
    const { sessions, loading, error, refetch } = useCohortSessions(cohortId);
    const { terms } = useTerms();
    const { cohorts } = useCohorts();
    const cohortFromQuery = parseCohortId(searchParams.get('cohort'));
    const cohortBackHref = cohortFromQuery
        ? `/academic/cohorts/${cohortFromQuery}`
        : '/sessions';

    const cohort = useMemo(
        () => cohorts.find((item) => item.id === cohortId) ?? null,
        [cohortId, cohorts]
    );

    const filteredSessions = useMemo(() => {
        const scopedSessions = sessions.filter((session) => {
            if (selectedTerm && session.term !== selectedTerm) {
                return false;
            }

            if (selectedType && session.session_type !== selectedType) {
                return false;
            }

            return true;
        });

        return sortSessionsByDate(scopedSessions);
    }, [selectedTerm, selectedType, sessions]);

    const heading = cohort
        ? `${cohort.name} Sessions`
        : sessions[0]?.cohort_name
            ? `${sessions[0].cohort_name} Sessions`
            : `Cohort #${cohortId} Sessions`;
    const subheading = cohort?.level
        ? `${cohort.level} session history and attendance records`
        : 'Cohort session history and attendance records';

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold theme-text">{heading}</h1>
              <Badge variant="blue" size="sm">
                Cohort History
              </Badge>
            </div>
            <p className="mt-1 text-sm theme-muted">{subheading}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link href={cohortBackHref}>
              <Button variant="ghost" size="sm">
                Back to Workspace
              </Button>
            </Link>
            <Link href="/lesson-plans/new">
              <Button size="sm">
                <Plus className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Plan a lesson</span>
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label=""
                value={selectedTerm?.toString() || ''}
                onChange={(event) =>
                  setSelectedTerm(event.target.value ? Number(event.target.value) : undefined)
                }
                options={[
                  { value: '', label: 'All Terms' },
                  ...terms.map((term) => ({ value: String(term.id), label: term.name })),
                ]}
              />
              <Select
                label=""
                value={String(cohortId)}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  router.push(nextValue ? `/sessions?cohort=${nextValue}` : '/sessions');
                }}
                options={[
                  { value: '', label: 'Back to Workspace' },
                  ...cohorts.map((cohortOption) => ({
                    value: String(cohortOption.id),
                    label: `${cohortOption.name} - ${cohortOption.level}`,
                  })),
                ]}
              />
              <Select
                label=""
                value={selectedType || ''}
                onChange={(event) => setSelectedType(event.target.value || undefined)}
                options={SESSION_TYPES}
              />
            </div>
          </div>
        </Card>

        {error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : loading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-2 theme-muted">Loading cohort sessions...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 theme-subtle" />
              <h3 className="mt-2 text-sm font-medium theme-text">No sessions found</h3>
              <p className="mt-1 text-sm theme-muted">
                {selectedTerm || selectedType
                  ? 'Try adjusting your filters'
                  : 'No session history is available for this cohort yet'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <CohortSessionsCards sessions={filteredSessions} />
            <div className="hidden md:block">
              <Card className="p-0">
                <CohortSessionsTable sessions={filteredSessions} />
              </Card>
            </div>
          </div>
        )}

        {filteredSessions.length > 0 ? (
          <p className="text-sm theme-muted">
            Showing <span className="font-medium">{filteredSessions.length}</span> session
            {filteredSessions.length !== 1 ? 's' : ''} for this cohort
            {isInstructor ? ' within your session workspace.' : '.'}
          </p>
        ) : null}
      </div>
    );
}

export function SessionsOverview() {
    const searchParams = useSearchParams();
    const cohortId = parseCohortId(searchParams.get('cohort'));

    if (cohortId) {
        return <CohortSessionsView cohortId={cohortId} />;
    }

    return <SessionWorkspaceView />;
}

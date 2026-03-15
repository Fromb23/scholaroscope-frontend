// ============================================================================
// app/(dashboard)/sessions/page.tsx - Enhanced UI with Better Visual Hierarchy
// ============================================================================

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, BookOpen, Users, Plus, Filter, ChevronDown, ChevronRight, Layers, MapPin, CheckCircle2 } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useSessions, useTodaySessions } from '@/app/core/hooks/useSessions';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { groupBy } from '@/app/utils/groupBy';
import { Fragment } from 'react';

export default function SessionsOverview() {
    const router = useRouter();
    const [selectedTerm, setSelectedTerm] = useState<number | undefined>();
    const [selectedCohort, setSelectedCohort] = useState<number | undefined>();
    const [selectedType, setSelectedType] = useState<string | undefined>();

    const { sessions, loading } = useSessions({
        term: selectedTerm,
        'cohort_subject__cohort': selectedCohort,
        session_type: selectedType
    });
    const { sessions: todaySessions } = useTodaySessions();
    const { terms } = useTerms();
    const { cohorts } = useCohorts();

    // Stats
    const totalSessions = sessions.length;
    const todayCount = todaySessions.length;

    // Count merged sessions (sessions with multiple cohorts)
    const mergedSessionsCount = sessions?.filter(s =>
        s.linked_cohorts && s.linked_cohorts.length > 1
    ).length;

    const avgAttendance = sessions.length > 0
        ? sessions.reduce((sum, s) => {
            const total = s.attendance_count.total;
            const present = s.attendance_count.present;
            return sum + (total > 0 ? (present / total) * 100 : 0);
        }, 0) / sessions.length
        : 0;

    // Grouping
    const grouped = useMemo(() =>
        groupBy(sessions, {
            keyFn: (s) => s.cohort_id,
            labelFn: (s) => `${s.cohort_name} · ${s.cohort_level}`,
        }),
        [sessions]
    );

    // Track which cohort groups are collapsed — default ALL CLOSED
    const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());

    // When sessions or filters change, collapse all groups by default
    useEffect(() => {
        const allCohortIds = Array.from(grouped.keys());
        setCollapsedGroups(new Set(allCohortIds));
    }, [grouped]);

    const toggleGroup = (cohortId: number) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            next.has(cohortId) ? next.delete(cohortId) : next.add(cohortId);
            return next;
        });
    };

    // Helpers
    const sessionTypes = [
        { value: '', label: 'All Types' },
        { value: 'LESSON', label: 'Lesson' },
        { value: 'PRACTICAL', label: 'Practical' },
        { value: 'PROJECT', label: 'Project' },
        { value: 'EXAM', label: 'Exam' },
        { value: 'FIELD_TRIP', label: 'Field Trip' },
        { value: 'ASSEMBLY', label: 'Assembly' },
        { value: 'OTHER', label: 'Other' }
    ];

    const getAttendanceColor = (percentage: number): 'success' | 'warning' | 'danger' => {
        if (percentage >= 80) return 'success';
        if (percentage >= 60) return 'warning';
        return 'danger';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Sessions</h1>
                    <p className="text-gray-600 mt-1">Manage class sessions and attendance</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/sessions/today">
                        <Button variant="primary">
                            <Clock className="w-4 h-4 mr-2" />
                            Today's Sessions
                        </Button>
                    </Link>
                    <Link href="/sessions/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Session
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Sessions"
                    value={totalSessions}
                    icon={Calendar}
                    color="blue"
                />
                <StatsCard
                    title="Today's Sessions"
                    value={todayCount}
                    icon={Clock}
                    color="green"
                />
                <StatsCard
                    title="Merged Sessions"
                    value={mergedSessionsCount}
                    icon={Layers}
                    color="purple"
                />
                <StatsCard
                    title="Avg Attendance"
                    value={`${avgAttendance.toFixed(1)}%`}
                    icon={Users}
                    color="orange"
                />
            </div>

            {/* Today's Sessions Quick View */}
            {todaySessions.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Today's Sessions</h2>
                            <Link href="/sessions/today">
                                <Button variant="ghost" size="sm">View All</Button>
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {todaySessions.slice(0, 3).map(session => {
                                const isMerged = session.linked_cohorts && session.linked_cohorts.length > 1;

                                return (
                                    <div
                                        key={session.id}
                                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {session.start_time}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {session.end_time}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                                    {session.subject_name}
                                                    {isMerged && (
                                                        <Badge variant="purple" size="sm">
                                                            <Layers className="w-3 h-3 mr-1" />
                                                            {session.linked_cohorts.length} cohorts
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {isMerged
                                                        ? session.linked_cohorts.map(c => c.cohort_name).join(', ')
                                                        : session.cohort_name
                                                    } • {session.venue} • {session.session_type_display}
                                                </div>
                                            </div>
                                        </div>
                                        <Link href={`/sessions/${session.id}`}>
                                            <Button variant="primary" size="sm">
                                                Mark Attendance
                                            </Button>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            )}

            {/* Filters */}
            <Card>
                <div className="p-4">
                    <div className="flex items-center gap-4">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                            <Select
                                label=""
                                value={selectedTerm?.toString() || ''}
                                onChange={(e) => setSelectedTerm(e.target.value ? Number(e.target.value) : undefined)}
                                options={[
                                    { value: '', label: 'All Terms' },
                                    ...terms?.map(t => ({
                                        value: String(t.id),
                                        label: t.name
                                    }))
                                ]}
                            />

                            <Select
                                label=""
                                value={selectedCohort?.toString() || ''}
                                onChange={(e) => setSelectedCohort(e.target.value ? Number(e.target.value) : undefined)}
                                options={[
                                    { value: '', label: 'All Cohorts' },
                                    ...cohorts.map(c => ({
                                        value: String(c.id),
                                        label: `${c.name} - ${c.level}`
                                    }))
                                ]}
                            />

                            <Select
                                label=""
                                value={selectedType || ''}
                                onChange={(e) => setSelectedType(e.target.value || undefined)}
                                options={sessionTypes}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Sessions Grouped by Cohort */}
            {loading ? (
                <div className="py-12 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-2 text-gray-600">Loading sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {selectedTerm || selectedCohort || selectedType
                                ? 'Try adjusting your filters'
                                : 'Get started by creating a new session'}
                        </p>
                        {!selectedTerm && !selectedCohort && !selectedType && (
                            <Link href="/sessions/new">
                                <Button className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Session
                                </Button>
                            </Link>
                        )}
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {Array.from(grouped.entries()).map(([cohortId, group]) => {
                        const isCollapsed = collapsedGroups.has(cohortId);

                        // Aggregate stats for the cohort group
                        const groupTotal = group.items.reduce((sum, s) => sum + s.attendance_count.total, 0);
                        const groupPresent = group.items.reduce((sum, s) => sum + s.attendance_count.present, 0);
                        const groupPercentage = groupTotal > 0 ? Math.round((groupPresent / groupTotal) * 100) : 0;

                        return (
                            <Card key={`group-${cohortId}`} className="overflow-hidden">
                                {/* Cohort Header - Clickable */}
                                <div
                                    onClick={() => toggleGroup(cohortId)}
                                    className="cursor-pointer select-none bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all p-5 border-b border-blue-200"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Toggle Icon */}
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                {isCollapsed
                                                    ? <ChevronRight className="h-5 w-5 text-blue-600" />
                                                    : <ChevronDown className="h-5 w-5 text-blue-600" />
                                                }
                                            </div>

                                            {/* Cohort Info */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                                                    {group.label}
                                                    <Badge variant="blue" size="sm">
                                                        {group.items.length} session{group.items.length !== 1 ? 's' : ''}
                                                    </Badge>
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Click to {isCollapsed ? 'expand' : 'collapse'} sessions
                                                </p>
                                            </div>
                                        </div>

                                        {/* Attendance Summary */}
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-sm text-gray-600">Total Attendance</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-2xl font-bold text-gray-900">
                                                        {groupPresent}/{groupTotal}
                                                    </span>
                                                    <Badge variant={getAttendanceColor(groupPercentage)} size="lg">
                                                        {groupPercentage}%
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sessions Table - Hidden when collapsed */}
                                {!isCollapsed && (
                                    <div className="bg-white">
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
                                                            className="hover:bg-blue-50 transition-colors"
                                                        >
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                                        <Calendar className="h-4 w-4 text-blue-600" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">
                                                                            {new Date(session.session_date).toLocaleDateString('en-US', {
                                                                                weekday: 'short',
                                                                                month: 'short',
                                                                                day: 'numeric'
                                                                            })}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 flex items-center gap-1">
                                                                            <Clock className="h-3 w-3" />
                                                                            {session.start_time} - {session.end_time}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-green-100 rounded-lg">
                                                                        <BookOpen className="h-4 w-4 text-green-600" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">{session.subject_name}</div>
                                                                        <div className="text-sm text-gray-500">{session.subject_code}</div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {isMerged ? (
                                                                    <div className="space-y-1">
                                                                        <Badge variant="purple" size="sm">
                                                                            <Layers className="w-3 h-3 mr-1" />
                                                                            {session.linked_cohorts.length} cohorts
                                                                        </Badge>
                                                                        <div className="text-xs text-gray-500">
                                                                            {session.linked_cohorts.slice(0, 2).map(c => c.cohort_name).join(', ')}
                                                                            {session.linked_cohorts.length > 2 && ` +${session.linked_cohorts.length - 2}`}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">{session.cohort_name}</div>
                                                                        <div className="text-sm text-gray-500">{session.cohort_level}</div>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="blue">{session.session_type_display}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                    <MapPin className="h-4 w-4 text-gray-400" />
                                                                    {session.venue || '-'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div>
                                                                        <div className="text-sm font-medium text-gray-900">
                                                                            {present}/{total}
                                                                        </div>
                                                                        <Badge variant={getAttendanceColor(percentage)} size="sm">
                                                                            {percentage}%
                                                                        </Badge>
                                                                    </div>
                                                                    {percentage === 100 && (
                                                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.push(`/sessions/${session.id}`);
                                                                    }}
                                                                >
                                                                    View Details
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Pagination info */}
            {sessions.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing <span className="font-medium">{sessions.length}</span> sessions across{' '}
                        <span className="font-medium">{grouped.size}</span> cohort{grouped.size !== 1 ? 's' : ''}
                        {mergedSessionsCount > 0 && (
                            <span className="text-purple-600 ml-2">
                                • {mergedSessionsCount} merged
                            </span>
                        )}
                    </p>
                </div>
            )}
        </div>
    );
}
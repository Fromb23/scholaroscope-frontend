'use client';

// ============================================================================
// app/core/components/instructors/InstructorProgressComponents.tsx
//
// Supporting components for the instructor detail page.
// No any. Typed props.
// ============================================================================

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Calendar,
    ChevronDown,
    ChevronRight,
    GraduationCap,
    TrendingUp,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { TeachingAssignment } from '@/app/core/types/academic';
import type { Session } from '@/app/core/types/session';

// ── SessionCohortGroup ────────────────────────────────────────────────────

interface SessionGroup {
    cohortId: number;
    cohortName: string;
    sessions: Session[];
}

function attendanceVariant(rate: number): 'success' | 'blue' | 'yellow' | 'default' {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'blue';
    if (rate > 0) return 'yellow';
    return 'default';
}

function teachingSourceLabel(assignment: TeachingAssignment) {
    if (assignment.source?.trim()) {
        return assignment.source.trim().toUpperCase();
    }

    if (assignment.subject_source?.trim()) {
        return assignment.subject_source.trim().toUpperCase();
    }

    return assignment.curriculum_name ?? assignment.curriculum_type;
}

function SessionCohortGroup({ group }: { group: SessionGroup }) {
    const [open, setOpen] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const totalPages = Math.ceil(group.sessions.length / pageSize);
    const paginated = group.sessions.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
            >
                {open
                    ? <ChevronDown className="h-4 w-4 text-blue-600 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                }
                <span className="font-semibold text-gray-900 flex-1 min-w-0 break-words">
                    {group.cohortName}
                </span>
                <Badge variant="info" size="sm" className="shrink-0 ml-auto">
                    {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
                </Badge>
            </button>

            {open && (
                <div className="border-t border-gray-100 overflow-x-auto">
                    <div className="min-w-[480px]">  {/* prevents shrinking below this width */}
                        <div className="divide-y divide-gray-50">
                            {paginated.map(session => {
                                const total = session.attendance_count?.total ?? 0;
                                const present = session.attendance_count?.present ?? 0;
                                const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                                return (
                                    <div key={session.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 break-words">
                                                {session.title || session.subject_name}
                                            </p>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                                <span className="text-xs text-gray-400 break-words">{session.subject_name}</span>
                                                <span className="text-xs text-gray-300">·</span>
                                                <span className="text-xs text-gray-400 shrink-0">
                                                    {new Date(session.session_date).toLocaleDateString('en-GB', {
                                                        day: '2-digit', month: 'short',
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant={attendanceVariant(rate)} size="sm">
                                                {total > 0 ? `${rate}%` : 'Unmarked'}
                                            </Badge>
                                            <Link href={`/sessions/${session.id}`}>
                                                <Button size="sm" variant="ghost">View</Button>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
                                    >Prev</button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
                                    >Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── GroupedSessions ───────────────────────────────────────────────────────

interface GroupedSessionsProps {
    sessions: Session[];
}

export function GroupedSessions({ sessions }: GroupedSessionsProps) {
    const groups = useMemo<SessionGroup[]>(() => {
        const map = new Map<number, SessionGroup>();
        sessions.forEach(s => {
            const cohortId = s.cohort_id ?? 0;
            const cohortName = s.cohort_name ?? 'Unknown Cohort';
            if (!map.has(cohortId)) {
                map.set(cohortId, { cohortId, cohortName, sessions: [] });
            }
            map.get(cohortId)!.sessions.push(s);
        });
        map.forEach(g => g.sessions.sort(
            (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        ));
        return Array.from(map.values());
    }, [sessions]);

    if (sessions.length === 0) return (
        <div className="py-10 text-center border border-dashed border-gray-200 rounded-xl">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No sessions recorded yet</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {groups.map(group => (
                <SessionCohortGroup key={group.cohortId} group={group} />
            ))}
        </div>
    );
}

interface TeachingAssignmentsListProps {
    assignments: TeachingAssignment[];
}

export function TeachingAssignmentsList({ assignments }: TeachingAssignmentsListProps) {
    if (assignments.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-3 lg:grid-cols-2">
            {assignments.map((assignment) => (
                <div
                    key={`${assignment.cohort_id}-${assignment.subject_id}-${assignment.academic_year}-${teachingSourceLabel(assignment)}`}
                    className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"
                >
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="info" size="sm">
                                    {assignment.cohort_name}
                                </Badge>
                                {assignment.subject_code ? (
                                    <Badge variant="default" size="sm">
                                        {assignment.subject_code}
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 break-words">
                                {assignment.subject_name}
                            </p>
                            <div className="grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Academic Year</p>
                                    <p className="mt-1 break-words">{assignment.academic_year}</p>
                                </div>
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Curriculum</p>
                                    <p className="mt-1 break-words">{assignment.curriculum_name ?? assignment.curriculum_type}</p>
                                </div>
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Source</p>
                                    <p className="mt-1 break-words">{teachingSourceLabel(assignment)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

interface CbcProgressAssignmentsProps {
    assignments: TeachingAssignment[];
}

export function CbcProgressAssignments({ assignments }: CbcProgressAssignmentsProps) {
    return (
        <div className="grid gap-3 xl:grid-cols-2">
            {assignments.map((assignment) => (
                <div
                    key={`${assignment.cohort_id}-${assignment.subject_id}-${assignment.academic_year}`}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="purple" size="sm">
                                    {assignment.cohort_name}
                                </Badge>
                                {assignment.subject_code ? (
                                    <Badge variant="default" size="sm">
                                        {assignment.subject_code}
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 break-words">
                                {assignment.subject_name}
                            </p>
                            <div className="grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Academic Year</p>
                                    <p className="mt-1 break-words">{assignment.academic_year}</p>
                                </div>
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Curriculum</p>
                                    <p className="mt-1 break-words">{assignment.curriculum_name ?? assignment.curriculum_type}</p>
                                </div>
                                <div>
                                    <p className="font-semibold uppercase tracking-wide text-gray-500">Source</p>
                                    <p className="mt-1 break-words">{teachingSourceLabel(assignment)}</p>
                                </div>
                            </div>
                        </div>
                        <Link href={`/cbc/progress/cohort/${assignment.cohort_id}`} className="w-full lg:w-auto">
                            <Button size="sm" variant="ghost" className="w-full lg:w-auto">
                                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                                View Progress
                            </Button>
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// app/core/hooks/useInstructorProgress.ts
//
// Owns all data fetching for the instructor progress/detail page.
// Replaces direct instructorsAPI and sessionAPI calls in the page.
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { instructorsAPI, InstructorProfile } from '@/app/core/api/instructors';
import type { TeachingAssignment } from '@/app/core/types/academic';
import { sessionAPI } from '@/app/core/api/sessions';
import type { Session } from '@/app/core/types/session';

export interface SessionStats {
    total: number;
    thisMonth: number;
}

export interface AttendanceStats {
    total: number;
    present: number;
    absent: number;
    late: number;
    rate: number;
}

type TeachingAssignmentIdentity = Pick<
    TeachingAssignment,
    | 'source'
    | 'subject_source'
    | 'curriculum_type'
    | 'teaching_link_id'
    | 'cbc_cohort_subject_id'
    | 'cambridge_cohort_subject_id'
    | 'cohort_subject_id'
    | 'subject_id'
>;

function normalizeTeachingSource(source?: string | null) {
    return source?.trim().toLowerCase() ?? '';
}

export function isCBCTeachingAssignment(
    assignment: Pick<TeachingAssignment, 'source' | 'subject_source' | 'curriculum_type'>
) {
    return (
        normalizeTeachingSource(assignment.source) === 'cbc' ||
        normalizeTeachingSource(assignment.subject_source) === 'cbc' ||
        assignment.curriculum_type === 'CBE'
    );
}

function getTeachingAssignmentIdentityValue(assignment: TeachingAssignmentIdentity) {
    return (
        assignment.teaching_link_id ??
        assignment.cbc_cohort_subject_id ??
        assignment.cambridge_cohort_subject_id ??
        assignment.cohort_subject_id ??
        assignment.subject_id ??
        null
    );
}

export function getTeachingAssignmentKey(assignment: TeachingAssignmentIdentity) {
    const source =
        normalizeTeachingSource(assignment.source) ||
        normalizeTeachingSource(assignment.subject_source) ||
        (assignment.curriculum_type === 'CBE' ? 'cbc' : 'unknown');
    const identity = getTeachingAssignmentIdentityValue(assignment);

    return `${source}-${identity ?? 'unresolved'}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useInstructorProgress(instructorId: number) {
    const [instructor, setInstructor] = useState<InstructorProfile | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (showLoadingState = true) => {
        if (showLoadingState) {
            setLoading(true);
            setError(null);
        }

        try {
            const instructorData = await instructorsAPI.getById(instructorId);
            setInstructor(instructorData);

            const sessionsData = await sessionAPI.getAll({ created_by: instructorData.email });
            const allSessions = Array.isArray(sessionsData)
                ? sessionsData
                : (sessionsData as { results?: Session[] })?.results ?? [];
            setSessions(allSessions as Session[]);
        } catch {
            if (showLoadingState) {
                setError('Failed to load instructor data');
            }
        } finally {
            if (showLoadingState) {
                setLoading(false);
            }
        }
    }, [instructorId]);

    useEffect(() => {
        void load();
    }, [load]);

    // ── Derived data ──────────────────────────────────────────────────────

    const teachingAssignments = useMemo<TeachingAssignment[]>(() => {
        if (!instructor?.teaching_assignments) return [];

        const seen = new Set<string>();
        const result: TeachingAssignment[] = [];

        instructor.teaching_assignments.forEach((assignment) => {
            const teachingKey = getTeachingAssignmentKey(assignment);
            if (seen.has(teachingKey)) {
                return;
            }

            seen.add(teachingKey);
            result.push(assignment);
        });

        return result;
    }, [instructor]);

    const cbcTeachingAssignments = useMemo(
        () => teachingAssignments.filter(isCBCTeachingAssignment),
        [teachingAssignments]
    );

    const sessionStats = useMemo<SessionStats>(() => {
        const now = new Date();
        return {
            total: sessions.length,
            thisMonth: sessions.filter(s => {
                const d = new Date(s.session_date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length,
        };
    }, [sessions]);

    const attendanceStats = useMemo<AttendanceStats>(() => {
        let total = 0, present = 0, absent = 0, late = 0;
        sessions.forEach(s => {
            total += s.attendance_count?.total ?? 0;
            present += s.attendance_count?.present ?? 0;
            absent += s.attendance_count?.absent ?? 0;
            late += s.attendance_count?.late ?? 0;
        });
        return { total, present, absent, late, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
    }, [sessions]);

    return {
        instructor,
        sessions,
        loading,
        error,
        refetch: () => load(false),
        teachingAssignments,
        cbcTeachingAssignments,
        sessionStats,
        attendanceStats,
    };
}

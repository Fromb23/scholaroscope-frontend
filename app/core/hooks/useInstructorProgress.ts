// ============================================================================
// app/core/hooks/useInstructorProgress.ts
//
// Owns all data fetching for the instructor progress/detail page.
// Replaces direct instructorsAPI and sessionAPI calls in the page.
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { instructorsAPI, InstructorProfile } from '@/app/core/api/instructors';
import { CohortAssignment } from '@/app/core/types/globalUsers';
import { sessionAPI } from '@/app/core/api/sessions';
import type { Session } from '@/app/core/types/session';

// ── Extended types ─────────────────────────────────────────────────────────
// The API returns more fields on CohortAssignment than the base type.
// Extend rather than cast to any.

export interface CohortSubjectLink {
    cohort_subject_id: number;
    subject_name: string;
}

export interface CohortAssignmentExtended extends CohortAssignment {
    subjects?: CohortSubjectLink[];
    is_cbc?: boolean;
}

export interface InstructorProfileExtended extends Omit<InstructorProfile, 'cohort_assignments'> {
    cohort_assignments: CohortAssignmentExtended[];
}

// ── Derived types ──────────────────────────────────────────────────────────

export interface CohortSubjectEntry {
    cohortSubjectId: number;
    subjectName: string;
    cohortName: string;
    isCBC: boolean;
}

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

// ── Hook ──────────────────────────────────────────────────────────────────

export function useInstructorProgress(instructorId: number) {
    const [instructor, setInstructor] = useState<InstructorProfileExtended | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const instructorData = await instructorsAPI.getById(instructorId) as InstructorProfileExtended;
            setInstructor(instructorData);

            const sessionsData = await sessionAPI.getAll({ created_by: instructorData.email });
            const allSessions = Array.isArray(sessionsData)
                ? sessionsData
                : (sessionsData as { results?: Session[] })?.results ?? [];
            setSessions(allSessions as Session[]);
        } catch {
            setError('Failed to load instructor data');
        } finally {
            setLoading(false);
        }
    }, [instructorId]);

    useEffect(() => { load(); }, [load]);

    // ── Derived data ──────────────────────────────────────────────────────

    const cohortSubjects = useMemo<CohortSubjectEntry[]>(() => {
        if (!instructor?.cohort_assignments) return [];
        const seen = new Set<number>();
        const result: CohortSubjectEntry[] = [];
        instructor.cohort_assignments.forEach(a => {
            (a.subjects ?? []).forEach(cs => {
                if (!seen.has(cs.cohort_subject_id)) {
                    seen.add(cs.cohort_subject_id);
                    result.push({
                        cohortSubjectId: cs.cohort_subject_id,
                        subjectName: cs.subject_name,
                        cohortName: a.cohort_name,
                        isCBC: a.is_cbc ?? false,
                    });
                }
            });
        });
        return result;
    }, [instructor]);

    const nonCBCSubjects = useMemo(
        () => cohortSubjects.filter(cs => !cs.isCBC),
        [cohortSubjects]
    );

    const cbcCohorts = useMemo(
        () => instructor?.cohort_assignments?.filter(a => a.is_cbc) ?? [],
        [instructor]
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
        refetch: load,
        nonCBCSubjects,
        cbcCohorts,
        sessionStats,
        attendanceStats,
    };
}
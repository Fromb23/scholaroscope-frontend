import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCBCProgressSummary } from '@/app/plugins/cbc/hooks/useCBC';
import { useCohort, useSubjects } from '@/app/core/hooks/useAcademic';
import { instructorsAPI } from '@/app/core/api/instructors';
import { useAuth } from '@/app/context/AuthContext';
import { isCBCTeachingAssignment } from '@/app/core/hooks/useInstructorProgress';

function parsePositiveNumber(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function useCBCCohortProgressPage(cohortId: number) {
    const searchParams = useSearchParams();
    const { user, activeRole } = useAuth();
    const isAdminLike = Boolean(user?.is_superadmin) || activeRole === 'ADMIN';
    const querySubjectId = parsePositiveNumber(searchParams.get('subject'));
    const queryCohortSubjectId = parsePositiveNumber(searchParams.get('cohort_subject_id'));
    const queryInstructorId = parsePositiveNumber(searchParams.get('instructor_id'));
    const returnTo = searchParams.get('returnTo');
    const hasScopedContext = searchParams.has('subject')
        || searchParams.has('cohort')
        || searchParams.has('cohort_subject_id')
        || searchParams.has('instructor_id');
    const { cohort, loading: cohortLoading } = useCohort(cohortId);
    const { subjects: allSubjects = [] } = useSubjects(cohort?.curriculum ?? undefined);
    const [instructorScopedSubjectIds, setInstructorScopedSubjectIds] = useState<Set<number> | null>(null);

    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;
        if (hasScopedContext) {
            return querySubjectId;
        }

        try {
            const stored = localStorage.getItem(`cbc_cohort_subject_${cohortId}`);
            return stored ? Number(stored) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        if (selectedSubjectId === null || hasScopedContext) return;

        try {
            localStorage.setItem(`cbc_cohort_subject_${cohortId}`, String(selectedSubjectId));
        } catch {
            // Ignore localStorage failures and preserve existing behavior.
        }
    }, [cohortId, hasScopedContext, selectedSubjectId]);

    useEffect(() => {
        if (querySubjectId !== null) {
            setSelectedSubjectId(querySubjectId);
        }
    }, [querySubjectId]);

    useEffect(() => {
        if (!isAdminLike || queryInstructorId === null) {
            setInstructorScopedSubjectIds(null);
            return;
        }

        let cancelled = false;
        void instructorsAPI.getById(queryInstructorId)
            .then((profile) => {
                if (cancelled) return;

                const scopedAssignments = (profile.teaching_assignments ?? []).filter((assignment) => (
                    isCBCTeachingAssignment(assignment)
                    && assignment.cohort_id === cohortId
                ));
                const matchingAssignments = queryCohortSubjectId === null
                    ? scopedAssignments
                    : scopedAssignments.filter((assignment) => {
                        const assignmentCohortSubjectId =
                            assignment.cohort_subject_id
                            ?? assignment.cbc_cohort_subject_id
                            ?? assignment.teaching_link_id
                            ?? null;
                        return assignmentCohortSubjectId === queryCohortSubjectId;
                    });

                setInstructorScopedSubjectIds(new Set(
                    matchingAssignments
                        .map((assignment) => assignment.subject_id)
                        .filter((subjectId) => Number.isFinite(subjectId))
                ));
            })
            .catch(() => {
                if (cancelled) return;
                setInstructorScopedSubjectIds(new Set<number>());
            });

        return () => {
            cancelled = true;
        };
    }, [cohortId, isAdminLike, queryCohortSubjectId, queryInstructorId]);

    const subjects = useMemo(() => {
        if (!instructorScopedSubjectIds) {
            return allSubjects;
        }

        return allSubjects.filter((subject) => instructorScopedSubjectIds.has(subject.id));
    }, [allSubjects, instructorScopedSubjectIds]);

    useEffect(() => {
        if (subjects.length === 0) {
            setSelectedSubjectId(null);
            return;
        }

        if (querySubjectId !== null) {
            if (subjects.some((subject) => subject.id === querySubjectId)) {
                setSelectedSubjectId(querySubjectId);
            }
            return;
        }

        if (selectedSubjectId !== null && subjects.some((subject) => subject.id === selectedSubjectId)) {
            return;
        }

        if (subjects.length === 1) {
            setSelectedSubjectId(subjects[0].id);
            return;
        }

        setSelectedSubjectId(null);
    }, [querySubjectId, selectedSubjectId, subjects]);

    const { data: summary, isLoading, error, refetch } = useCBCProgressSummary({
        cohort_id: cohortId,
        subject_id: selectedSubjectId,
    });

    const totalLearners = useMemo(() => {
        if (!summary) return 0;
        return Object.values(summary.competency).reduce((sum, count) => sum + count, 0);
    }, [summary]);

    return {
        cohort,
        cohortLoading,
        subjects,
        selectedSubjectId,
        setSelectedSubjectId,
        summary,
        isLoading,
        error,
        refetch,
        totalLearners,
        returnTo: returnTo?.startsWith('/') ? returnTo : null,
        instructorContextEnabled: isAdminLike && queryInstructorId !== null,
    };
}

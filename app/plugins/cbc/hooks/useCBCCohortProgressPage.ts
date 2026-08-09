import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCBCProgressSummary } from '@/app/plugins/cbc/hooks/useCBC';
import { useCohort, useSubjects } from '@/app/core/hooks/useAcademic';
import { instructorsAPI } from '@/app/core/api/instructors';
import { useAuth } from '@/app/context/AuthContext';
import { isCBCTeachingAssignment } from '@/app/core/hooks/useInstructorProgress';
import { sanitizeInternalReturnTo, updateCbcUrlFilter } from '@/app/plugins/cbc/lib/navigation';
import { hasPermission } from '@/app/utils/permissions';

function parsePositiveNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function useCBCCohortProgressPage(cohortId: number) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeOperatingContext, capabilities } = useAuth();
  const hasReportAccess = hasPermission(capabilities, 'reports.view');
  const querySubjectId = parsePositiveNumber(searchParams.get('subject'));
  const queryCohortSubjectId = parsePositiveNumber(searchParams.get('cohort_subject_id'));
  const queryCbcCohortSubjectId = parsePositiveNumber(searchParams.get('cbc_cohort_subject_id'));
  const queryInstructorId = parsePositiveNumber(searchParams.get('instructor_id'));
  const instructorContextEnabled =
    activeOperatingContext === 'WORKSPACE_MANAGEMENT' &&
    hasReportAccess &&
    queryInstructorId !== null;
  const returnTo = useMemo(
    () => sanitizeInternalReturnTo(searchParams.get('returnTo')),
    [searchParams],
  );
  const hasScopedContext =
    searchParams.has('subject') ||
    searchParams.has('cohort') ||
    searchParams.has('cohort_subject_id') ||
    searchParams.has('cbc_cohort_subject_id') ||
    searchParams.has('instructor_id');
  const { cohort, loading: cohortLoading } = useCohort(cohortId);
  const { subjects: allSubjects = [] } = useSubjects(cohort?.curriculum ?? undefined);
  const [instructorScopedSubjectIds, setInstructorScopedSubjectIds] = useState<Set<number> | null>(
    null,
  );
  const [instructorScopeLoading, setInstructorScopeLoading] = useState(false);

  const [selectedSubjectIdState, setSelectedSubjectIdState] = useState<number | null>(() => {
    if (hasScopedContext) {
      return querySubjectId;
    }
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(`cbc_cohort_subject_${cohortId}`);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  const replaceSubjectQuery = useCallback(
    (nextSubjectId: number | null) => {
      const nextParams = updateCbcUrlFilter(searchParams, 'subject', nextSubjectId);

      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      if (nextUrl === currentUrl) {
        return;
      }

      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setSelectedSubjectId = useCallback(
    (nextSubjectId: number | null) => {
      setSelectedSubjectIdState(nextSubjectId);
      if (hasScopedContext || querySubjectId !== null) {
        replaceSubjectQuery(nextSubjectId);
      }
    },
    [hasScopedContext, querySubjectId, replaceSubjectQuery],
  );

  useEffect(() => {
    if (selectedSubjectIdState === null || hasScopedContext) return;

    try {
      localStorage.setItem(`cbc_cohort_subject_${cohortId}`, String(selectedSubjectIdState));
    } catch {
      // Ignore localStorage failures and preserve existing behavior.
    }
  }, [cohortId, hasScopedContext, selectedSubjectIdState]);

  useEffect(() => {
    if (querySubjectId !== null) {
      setSelectedSubjectIdState(querySubjectId);
    }
  }, [querySubjectId]);

  useEffect(() => {
    if (!instructorContextEnabled || queryInstructorId === null) {
      setInstructorScopedSubjectIds(null);
      setInstructorScopeLoading(false);
      return;
    }

    let cancelled = false;
    setInstructorScopeLoading(true);
    void instructorsAPI
      .getById(queryInstructorId)
      .then((profile) => {
        if (cancelled) return;

        const scopedAssignments = (profile.teaching_assignments ?? []).filter(
          (assignment) => isCBCTeachingAssignment(assignment) && assignment.cohort_id === cohortId,
        );
        const matchingAssignments = scopedAssignments.filter(
          (assignment) =>
            (queryCohortSubjectId === null ||
              assignment.cohort_subject_id === queryCohortSubjectId) &&
            (queryCbcCohortSubjectId === null ||
              assignment.cbc_cohort_subject_id === queryCbcCohortSubjectId),
        );

        setInstructorScopedSubjectIds(
          new Set(
            matchingAssignments
              .map((assignment) => assignment.topic_subject_id)
              .filter(
                (subjectId): subjectId is number =>
                  typeof subjectId === 'number' && Number.isFinite(subjectId),
              ),
          ),
        );
        setInstructorScopeLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setInstructorScopedSubjectIds(new Set<number>());
        setInstructorScopeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    cohortId,
    instructorContextEnabled,
    queryCbcCohortSubjectId,
    queryCohortSubjectId,
    queryInstructorId,
  ]);

  const subjects = useMemo(() => {
    if (instructorContextEnabled && instructorScopedSubjectIds === null) {
      return [];
    }

    if (!instructorScopedSubjectIds) {
      return allSubjects;
    }

    return allSubjects.filter((subject) => instructorScopedSubjectIds.has(subject.id));
  }, [allSubjects, instructorContextEnabled, instructorScopedSubjectIds]);

  useEffect(() => {
    if (subjects.length === 0) {
      setSelectedSubjectIdState(null);
      return;
    }

    if (querySubjectId !== null) {
      if (subjects.some((subject) => subject.id === querySubjectId)) {
        setSelectedSubjectIdState(querySubjectId);
        return;
      }

      const fallbackSubjectId = subjects.length === 1 ? subjects[0].id : null;
      setSelectedSubjectIdState(fallbackSubjectId);
      replaceSubjectQuery(fallbackSubjectId);
      return;
    }

    if (
      selectedSubjectIdState !== null &&
      subjects.some((subject) => subject.id === selectedSubjectIdState)
    ) {
      return;
    }

    if (subjects.length === 1) {
      setSelectedSubjectIdState(subjects[0].id);
      return;
    }

    setSelectedSubjectIdState(null);
  }, [querySubjectId, replaceSubjectQuery, selectedSubjectIdState, subjects]);

  const subjectIdSet = useMemo(() => new Set(subjects.map((subject) => subject.id)), [subjects]);
  const scopedSelectedSubjectId =
    selectedSubjectIdState !== null && subjectIdSet.has(selectedSubjectIdState)
      ? selectedSubjectIdState
      : null;

  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useCBCProgressSummary({
    cohort_id: cohortId,
    subject_id: instructorScopeLoading ? null : scopedSelectedSubjectId,
    cohort_subject_id: queryCohortSubjectId,
    cbc_cohort_subject_id: queryCbcCohortSubjectId,
    instructor_id: queryInstructorId,
    authority_mode: activeOperatingContext === 'WORKSPACE_MANAGEMENT' ? 'supervision' : 'teaching',
  });

  const totalOutcomeRecords = useMemo(() => {
    if (!summary) return 0;
    return (
      summary.total_outcome_records ??
      Object.values(summary.competency).reduce((sum, count) => sum + count, 0)
    );
  }, [summary]);

  return {
    cohort,
    cohortLoading,
    instructorScopeLoading,
    subjects,
    selectedSubjectId: scopedSelectedSubjectId,
    setSelectedSubjectId,
    summary,
    isLoading,
    error,
    refetch,
    totalOutcomeRecords,
    returnTo,
    instructorContextEnabled,
  };
}

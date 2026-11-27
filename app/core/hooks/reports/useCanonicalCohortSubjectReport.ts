import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/app/context/AuthContext';
import { cohortSubjectReportsAPI } from '@/app/core/api/reporting';
import { reportKeys } from '@/app/core/lib/queryKeys';
import type {
  ClassSubjectReportPayload,
  InstructorCohortSubjectLearnersReport,
  InstructorCohortSubjectPerformanceReport,
  InstructorCohortSubjectTeachingActivityReport,
} from '@/app/core/types/reporting';
import type { ApiError } from '@/app/core/types/errors';
import { resolveErrorMessage } from '@/app/core/types/errors';

type AuthorityMode = 'teaching' | 'supervision';
type Projection = 'overview' | 'learners' | 'performance' | 'teaching-activity';

function useProjection<T>(
  projection: Projection,
  cohortSubjectId: number,
  termId: number | null,
  authorityMode: AuthorityMode,
  enabled: boolean,
  load: () => Promise<T>,
  fallbackMessage: string,
) {
  const { activeOrg, user, workspaceGeneration } = useAuth();
  const query = useQuery({
    queryKey: reportKeys.cohortSubjectProjection(
      activeOrg?.id ?? null,
      user?.id ?? null,
      workspaceGeneration,
      cohortSubjectId,
      termId,
      authorityMode,
      projection,
    ),
    queryFn: load,
    enabled: Boolean(activeOrg && enabled),
    staleTime: 60_000,
  });
  const apiError = query.error as ApiError | null;
  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: apiError ? resolveErrorMessage(apiError, fallbackMessage) : null,
    errorStatus: apiError?.response?.status ?? null,
    refetch: query.refetch,
  };
}

export function useCanonicalCohortSubjectOverview(
  cohortSubjectId: number,
  termId: number | null,
  authorityMode: AuthorityMode,
  enabled: boolean,
) {
  return useProjection<ClassSubjectReportPayload>(
    'overview',
    cohortSubjectId,
    termId,
    authorityMode,
    enabled,
    () => cohortSubjectReportsAPI.getOverview(cohortSubjectId, { termId, authorityMode }),
    'Failed to load the class-subject overview.',
  );
}

export function useCanonicalCohortSubjectLearners(
  cohortSubjectId: number,
  termId: number | null,
  authorityMode: AuthorityMode,
  enabled: boolean,
) {
  return useProjection<InstructorCohortSubjectLearnersReport>(
    'learners',
    cohortSubjectId,
    termId,
    authorityMode,
    enabled,
    () => cohortSubjectReportsAPI.getLearners(cohortSubjectId, { termId, authorityMode }),
    'Failed to load learners.',
  );
}

export function useCanonicalCohortSubjectPerformance(
  cohortSubjectId: number,
  termId: number | null,
  authorityMode: AuthorityMode,
  enabled: boolean,
) {
  return useProjection<InstructorCohortSubjectPerformanceReport>(
    'performance',
    cohortSubjectId,
    termId,
    authorityMode,
    enabled,
    () => cohortSubjectReportsAPI.getPerformance(cohortSubjectId, { termId, authorityMode }),
    'Failed to load assessments and results.',
  );
}

export function useCanonicalCohortSubjectTeachingActivity(
  cohortSubjectId: number,
  termId: number | null,
  authorityMode: AuthorityMode,
  enabled: boolean,
) {
  return useProjection<InstructorCohortSubjectTeachingActivityReport>(
    'teaching-activity',
    cohortSubjectId,
    termId,
    authorityMode,
    enabled,
    () => cohortSubjectReportsAPI.getTeachingActivity(cohortSubjectId, { termId, authorityMode }),
    'Failed to load teaching and curriculum activity.',
  );
}

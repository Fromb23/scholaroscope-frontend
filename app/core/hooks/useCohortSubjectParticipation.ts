'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCohortSubjectLearners } from '@/app/core/api/academic';
import { instructorsAPI } from '@/app/core/api/instructors';
import { academicKeys } from '@/app/core/lib/queryKeys';
import type { CohortSubject, CohortSubjectLearnerCounts } from '@/app/core/types/academic';

export type CohortSubjectInstructorState = 'assigned' | 'unassigned' | 'unavailable';

export interface CohortSubjectParticipationSummary {
    counts: CohortSubjectLearnerCounts | null;
    instructorName: string | null;
    instructorState: CohortSubjectInstructorState;
}


async function getInstructorSummary(cohortSubjectId: number): Promise<{
    instructorName: string | null;
    instructorState: CohortSubjectInstructorState;
}> {
    try {
        const history = await instructorsAPI.getInstructorHistory(cohortSubjectId);

        if (!history.has_active_instructor) {
            return {
                instructorName: null,
                instructorState: 'unassigned',
            };
        }

        const activeInstructor = history.history.find((entry) => entry.is_active);

        return {
            instructorName: activeInstructor?.user_full_name ?? null,
            instructorState: activeInstructor?.user_full_name ? 'assigned' : 'unavailable',
        };
    } catch {
        return {
            instructorName: null,
            instructorState: 'unavailable',
        };
    }
}

function getInstructorSummaryFromCohortSubject(subject: CohortSubject): {
  instructorName: string | null;
  instructorState: CohortSubjectInstructorState;
} | null {
  if (subject.current_instructor_name) {
    return {
      instructorName: subject.current_instructor_name,
      instructorState: 'assigned',
    };
  }

  if (subject.active_instructor?.full_name) {
    return {
      instructorName: subject.active_instructor.full_name,
      instructorState: 'assigned',
    };
  }

  if (subject.has_active_instructor === false) {
    return {
      instructorName: null,
      instructorState: 'unassigned',
    };
  }

  return null;
}

export function useCohortSubjectParticipation(
  cohortId: number | null,
  cohortSubjects: CohortSubject[],
  options?: { enabled?: boolean; includeInstructor?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const includeInstructor = options?.includeInstructor ?? true;

  const subjectIdsKey = useMemo(
    () =>
      cohortSubjects
        .map((subject) => subject.id)
        .sort((left, right) => left - right)
        .join(','),
    [cohortSubjects],
  );

  const query = useQuery<Record<number, CohortSubjectParticipationSummary>, Error>({
    queryKey: academicKeys.cohorts.subjectParticipation(cohortId, subjectIdsKey, includeInstructor),
    enabled: enabled && typeof cohortId === 'number' && cohortId > 0 && cohortSubjects.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const summaries = await Promise.all(
        cohortSubjects.map(async (subject) => {
          const serializedInstructor = getInstructorSummaryFromCohortSubject(subject);

          const fallbackInstructor = {
            instructorName: null,
            instructorState: 'unavailable' as const,
          };

          try {
            const [learners, instructor] = await Promise.all([
              getCohortSubjectLearners(subject.id),
              serializedInstructor
                ? Promise.resolve(serializedInstructor)
                : includeInstructor
                  ? getInstructorSummary(subject.id)
                  : Promise.resolve(fallbackInstructor),
            ]);

            return [
              subject.id,
              {
                counts: learners.counts,
                instructorName: instructor.instructorName,
                instructorState: instructor.instructorState,
              },
            ] as const;
          } catch {
            return [
              subject.id,
              {
                counts: null,
                ...(serializedInstructor ?? fallbackInstructor),
              },
            ] as const;
          }
        }),
      );

      return Object.fromEntries(summaries);
    },
  });

  return {
    summaries: query.data ?? {},
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

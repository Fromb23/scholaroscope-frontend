import type { CohortSubject } from '@/app/core/types/academic';
import type { CohortSubjectAction } from '@/app/core/components/cohorts/CohortSubjectParticipationSection';

function buildScopedHref(path: string, params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function buildCohortSubjectReturnTo(cohortHref: string, cohortSubjectId: number): string {
  return `${cohortHref}#subject-${cohortSubjectId}`;
}

export function shouldShowCohortSubjectTeachingActions(params: {
  isTeachingActor: boolean;
}): boolean {
  return params.isTeachingActor;
}

export function buildCohortSubjectTeachingActions(params: {
  cohortId: number;
  cohortReturnTo: string;
  subject: CohortSubject;
  isCBC: boolean;
  hasCBCPlugin: boolean;
}): CohortSubjectAction[] {
  const { cohortId, cohortReturnTo, subject, isCBC, hasCBCPlugin } = params;
  const subjectReturnTo = buildCohortSubjectReturnTo(cohortReturnTo, subject.id);
  const baseParams = {
    cohort: cohortId,
    cohort_subject: subject.id,
    source: 'cohort_subject',
    returnTo: subjectReturnTo,
  };
  const actions: CohortSubjectAction[] = [
    {
      label: 'Schemes',
      href: buildScopedHref('/schemes', baseParams),
    },
    {
      label: 'Lesson plans',
      href: buildScopedHref('/lesson-plans', baseParams),
    },
    {
      label: 'Sessions',
      href: buildScopedHref('/sessions', baseParams),
    },
    {
      label: 'Assignments',
      href: buildScopedHref(`/academic/cohorts/${cohortId}/assignments`, baseParams),
    },
    {
      label: 'Assessments',
      href: buildScopedHref('/assessments', baseParams),
    },
    {
      label: 'Subject reports',
      href: buildScopedHref(`/reports/instructor/cohort-subjects/${subject.id}`, {
        returnTo: subjectReturnTo,
        source: 'cohort_subject',
      }),
    },
  ];

  if (isCBC && hasCBCPlugin) {
    actions.push(
      {
        label: 'CBC Browser',
        href: buildScopedHref('/cbc/browser', {
          cohort: cohortId,
          cohort_subject_id: subject.id,
          returnTo: subjectReturnTo,
          source: 'cohort_subject',
        }),
      },
      {
        label: 'CBC Progress',
        href: buildScopedHref('/cbc/progress', {
          cohort: cohortId,
          cohort_subject_id: subject.id,
          returnTo: subjectReturnTo,
          source: 'cohort_subject',
        }),
      },
    );
  }

  return actions;
}

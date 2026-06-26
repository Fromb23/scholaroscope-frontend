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
  isClassConfigurationWorkspace?: boolean;
}): CohortSubjectAction[] {
  const { cohortId, cohortReturnTo, subject, isCBC, hasCBCPlugin, isClassConfigurationWorkspace = false } = params;
  const subjectReturnTo = buildCohortSubjectReturnTo(cohortReturnTo, subject.id);
  const cbcCohortSubjectId = subject.cbc_cohort_subject_id ?? null;
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
  ];
  const subjectReportAction = {
    label: 'Subject report',
    href: buildScopedHref(`/reports/instructor/cohort-subjects/${subject.id}`, {
      returnTo: subjectReturnTo,
      source: 'cohort_subject',
    }),
  };

  if (isCBC && hasCBCPlugin) {
    if (isClassConfigurationWorkspace) {
      actions.push(
        {
          label: 'Configure policy',
          href: buildScopedHref(`/academic/cohorts/${cohortId}/subjects/${subject.id}/report-policy`, {
            source: 'class_configuration',
            cohort: cohortId,
            cohort_subject: subject.id,
            cbc_cohort_subject: cbcCohortSubjectId,
            returnTo: subjectReturnTo,
          }),
        },
        {
          label: 'Compute subject results',
          href: buildScopedHref(`/academic/cohorts/${cohortId}/subjects/${subject.id}/report-computation`, {
            source: 'class_configuration',
            cohort: cohortId,
            cohort_subject: subject.id,
            returnTo: subjectReturnTo,
          }),
        },
      );
    }

    actions.push(
      subjectReportAction,
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
  } else {
    actions.push(subjectReportAction);
  }

  return actions;
}

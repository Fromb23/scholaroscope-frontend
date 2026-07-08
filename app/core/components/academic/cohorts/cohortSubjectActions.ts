import type { CohortSubject } from '@/app/core/types/academic';
import type { CohortSubjectAction } from '@/app/core/components/cohorts/CohortSubjectParticipationSection';

export type CohortSubjectActionMobileGroup = 'daily' | 'setup';
export type CohortSubjectActionMobileIcon =
  | 'assignments'
  | 'assessments'
  | 'calculator'
  | 'cbc-content'
  | 'cbc-progress'
  | 'instructor'
  | 'learners'
  | 'lesson'
  | 'record'
  | 'report'
  | 'report-rules'
  | 'scheme';

export interface CohortSubjectActionMobilePresentation {
  mobileGroup: CohortSubjectActionMobileGroup;
  mobileIcon: CohortSubjectActionMobileIcon;
  mobileLabel: string;
}

export const COHORT_SUBJECT_ACTION_MOBILE_PRESENTATION = {
  'Manage learners': {
    mobileGroup: 'daily',
    mobileIcon: 'learners',
    mobileLabel: 'Learners',
  },
  'Prepare scheme': {
    mobileGroup: 'setup',
    mobileIcon: 'scheme',
    mobileLabel: 'Scheme',
  },
  'Prepare lesson': {
    mobileGroup: 'daily',
    mobileIcon: 'lesson',
    mobileLabel: 'Lesson',
  },
  'Record lesson': {
    mobileGroup: 'daily',
    mobileIcon: 'record',
    mobileLabel: 'Record',
  },
  Assignments: {
    mobileGroup: 'daily',
    mobileIcon: 'assignments',
    mobileLabel: 'Assignments',
  },
  Assessments: {
    mobileGroup: 'daily',
    mobileIcon: 'assessments',
    mobileLabel: 'Assessments',
  },
  'Set report rules': {
    mobileGroup: 'setup',
    mobileIcon: 'report-rules',
    mobileLabel: 'Report rules',
  },
  'Calculate subject report': {
    mobileGroup: 'setup',
    mobileIcon: 'calculator',
    mobileLabel: 'Calculate report',
  },
  'Open subject report': {
    mobileGroup: 'daily',
    mobileIcon: 'report',
    mobileLabel: 'Report',
  },
  'View CBC content': {
    mobileGroup: 'setup',
    mobileIcon: 'cbc-content',
    mobileLabel: 'CBC content',
  },
  'Check CBC progress': {
    mobileGroup: 'daily',
    mobileIcon: 'cbc-progress',
    mobileLabel: 'CBC progress',
  },
  'Assign/Manage Instructor': {
    mobileGroup: 'setup',
    mobileIcon: 'instructor',
    mobileLabel: 'Instructor',
  },
} as const satisfies Record<string, CohortSubjectActionMobilePresentation>;

const DEFAULT_MOBILE_PRESENTATION: CohortSubjectActionMobilePresentation = {
  mobileGroup: 'setup',
  mobileIcon: 'scheme',
  mobileLabel: 'Action',
};

export function getCohortSubjectActionMobilePresentation(label: string): CohortSubjectActionMobilePresentation {
  return (COHORT_SUBJECT_ACTION_MOBILE_PRESENTATION as Record<string, CohortSubjectActionMobilePresentation>)[label]
    ?? {
      ...DEFAULT_MOBILE_PRESENTATION,
      mobileLabel: label,
    };
}

export function withCohortSubjectActionMobilePresentation<T extends { label: string }>(
  action: T
): T & CohortSubjectActionMobilePresentation {
  return {
    ...action,
    ...getCohortSubjectActionMobilePresentation(action.label),
  };
}

export function splitCohortSubjectMobileActions<T extends { mobileGroup?: CohortSubjectActionMobileGroup }>(
  actions: T[],
): { daily: T[]; setup: T[] } {
  return {
    daily: actions.filter((action) => action.mobileGroup === 'daily'),
    setup: actions.filter((action) => action.mobileGroup !== 'daily'),
  };
}

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
  isSelfManagedTeachingWorkspace: boolean;
}): boolean {
  return params.isTeachingActor && params.isSelfManagedTeachingWorkspace;
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
      label: 'Prepare scheme',
      href: buildScopedHref('/schemes', baseParams),
    },
    {
      label: 'Prepare lesson',
      href: buildScopedHref('/lesson-plans', baseParams),
    },
    {
      label: 'Record lesson',
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
    label: 'Open subject report',
    href: buildScopedHref(`/reports/instructor/cohort-subjects/${subject.id}`, {
      returnTo: subjectReturnTo,
      source: 'cohort_subject',
    }),
  };

  if (isCBC && hasCBCPlugin) {
    if (isClassConfigurationWorkspace) {
      actions.push(
        {
          label: 'Set report rules',
          href: buildScopedHref(`/academic/cohorts/${cohortId}/subjects/${subject.id}/report-policy`, {
            source: 'class_configuration',
            cohort: cohortId,
            cohort_subject: subject.id,
            cbc_cohort_subject: cbcCohortSubjectId,
            returnTo: subjectReturnTo,
          }),
        },
        {
          label: 'Calculate subject report',
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
        label: 'View CBC content',
        href: buildScopedHref('/cbc/browser', {
          cohort: cohortId,
          cohort_subject_id: subject.id,
          returnTo: subjectReturnTo,
          source: 'cohort_subject',
        }),
      },
      {
        label: 'Check CBC progress',
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

  return actions.map((action) => withCohortSubjectActionMobilePresentation(action));
}

import { redirect } from 'next/navigation';
import { buildInstructorReportHref } from '@/app/core/components/reports/reportNavigation';

function firstQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function LegacyAdminTeacherReportRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const nextParams = new URLSearchParams();
  const passthroughKeys = [
    'term',
    'cohortSubject',
    'cohort_subject_id',
    'startDate',
    'start_date',
    'endDate',
    'end_date',
  ];

  passthroughKeys.forEach((key) => {
    const value = firstQueryValue(query[key]);
    if (value) {
      nextParams.set(key, value);
    }
  });

  const returnTo = firstQueryValue(query.returnTo) ?? `/admin/instructors/${id}/progress`;
  nextParams.set('returnTo', returnTo);

  const href = buildInstructorReportHref(Number(id), nextParams);

  redirect(href);
}

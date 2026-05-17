import type {
  AssessmentCompletion,
  AttendanceSummary,
  CbcCode,
  CbcPerformance,
  CbcPerformanceSummary,
  CbcStudentResult,
  CbcStudentSection,
  GenericPerformance,
  GenericPerformanceSummary,
  GenericStudentSection,
  ReportAverageSummary,
  ReportCoverage,
  ReportingSource,
} from '@/app/core/types/reporting';

export const CBC_CODE_ORDER: CbcCode[] = [
  'EE1',
  'EE2',
  'ME1',
  'ME2',
  'AE1',
  'AE2',
  'BE1',
  'BE2',
];

export function formatPercent(
  value: number | null | undefined,
  digits = 1,
  fallback = '—',
): string {
  return typeof value === 'number' ? `${value.toFixed(digits)}%` : fallback;
}

export function formatNumber(
  value: number | null | undefined,
  digits = 1,
  fallback = '—',
): string {
  return typeof value === 'number' ? value.toFixed(digits) : fallback;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function getReportingSourceLabel(source: ReportingSource): string {
  switch (source) {
    case 'generic':
      return 'Generic numeric';
    case 'cbc':
      return 'CBC';
    case 'cambridge_pending':
      return 'Curriculum reporting pending';
    case 'unsupported':
      return 'Unsupported reporting adapter';
    default:
      return source;
  }
}

export function getReportingSourceVariant(source: ReportingSource): 'blue' | 'green' | 'yellow' | 'orange' {
  switch (source) {
    case 'generic':
      return 'blue';
    case 'cbc':
      return 'green';
    case 'cambridge_pending':
      return 'yellow';
    case 'unsupported':
    default:
      return 'orange';
  }
}

export function countEntriesFromMap(
  counts: Record<string, number> | null | undefined,
  order?: string[],
): Array<{ label: string; count: number }> {
  if (!counts) return [];

  const entries = Object.entries(counts)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .map(([label, count]) => ({ label, count }));

  if (!order || order.length === 0) {
    return entries.sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  }

  const rank = new Map(order.map((label, index) => [label, index]));
  return entries.sort((left, right) => {
    const leftRank = rank.get(left.label) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = rank.get(right.label) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return right.count - left.count || left.label.localeCompare(right.label);
  });
}

export function countMapFromItems<T extends object>(
  items: T[] | null | undefined,
  labelKey: keyof T,
): Record<string, number> {
  return (items ?? []).reduce<Record<string, number>>((acc, item) => {
    const labelValue = item[labelKey];
    const countValue = (item as { count?: unknown }).count;
    const label = typeof labelValue === 'string' && labelValue.length > 0 ? labelValue : 'Unknown';
    const count = typeof countValue === 'number' ? countValue : 0;
    acc[label] = count;
    return acc;
  }, {});
}

export function getAssessmentCompletionRatio(completion: AssessmentCompletion | null | undefined): number | null {
  if (!completion || completion.total_assessments <= 0) return null;
  const completed = completion.completed_scores ?? completion.finalized_assessments;
  return Math.min(Math.max((completed / completion.total_assessments) * 100, 0), 100);
}

export function getAttendancePercentage(
  attendance: AttendanceSummary | ReportAverageSummary | null | undefined,
): number | null {
  if (!attendance) return null;
  if ('attendance_percentage' in attendance) return attendance.attendance_percentage;
  return attendance.average;
}

export function getCoverageEntries(
  coverage: ReportCoverage | null | undefined,
  maxItems = 4,
): Array<{ label: string; value: string }> {
  if (!coverage) return [];

  return Object.entries(coverage)
    .filter(([, value]) => typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean')
    .slice(0, maxItems)
    .map(([key, value]) => ({
      label: key.replace(/_/g, ' '),
      value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value),
    }));
}

export function resolveGenericStudentResult(
  generic: GenericStudentSection | null | undefined,
): {
  finalScore: number | null;
  averageScore: number | null;
  weightedAverage: number | null;
  letterGrade: string | null;
  letterLabel: string | null;
  gradeStatus: string | null;
  position: number | null;
  totalInClass: number | null;
  policyName: string | null;
  componentScores: Record<string, number | string | null> | null;
  computedAt: string | null;
  note: string | null;
} {
  const computed = generic?.computed_grade ?? null;
  const summary = generic?.grade_summary ?? null;

  return {
    finalScore: generic?.final_score ?? computed?.final_score ?? null,
    averageScore: generic?.average_score ?? summary?.average_score ?? null,
    weightedAverage: generic?.weighted_average ?? summary?.weighted_average ?? null,
    letterGrade: generic?.letter_grade ?? computed?.letter_grade ?? summary?.final_grade ?? null,
    letterLabel: generic?.letter_label ?? computed?.letter_label ?? null,
    gradeStatus: generic?.grade_status ?? computed?.grade_status ?? null,
    position: generic?.position ?? computed?.position ?? null,
    totalInClass: generic?.total_in_class ?? computed?.total_in_class ?? null,
    policyName: generic?.policy_name ?? computed?.policy_name ?? null,
    componentScores: generic?.component_scores ?? computed?.component_scores ?? null,
    computedAt: generic?.computed_at ?? computed?.computation_timestamp ?? null,
    note: generic?.note ?? null,
  };
}

export function resolveCbcStudentResult(
  cbc: CbcStudentSection | CbcStudentResult | null | undefined,
): CbcStudentResult | null {
  if (!cbc) return null;
  return 'cbc_result' in cbc ? cbc.cbc_result : cbc;
}

export function resolveCbcReadiness(
  cbc: CbcStudentSection | CbcStudentResult | null | undefined,
): CbcStudentSection['readiness'] | null {
  if (!cbc || !('cbc_result' in cbc)) return null;
  return cbc.readiness ?? null;
}

export function toGenericPerformance(
  performance: GenericPerformanceSummary | GenericPerformance | null | undefined,
): GenericPerformance | null {
  if (!performance) return null;

  return {
    average_score: performance.average_score,
    computed_count: performance.computed_count,
    distribution_by_letter: performance.distribution_by_letter,
    grade_status_counts: performance.grade_status_counts,
    highest_score: 'highest_score' in performance ? performance.highest_score : null,
    lowest_score: 'lowest_score' in performance ? performance.lowest_score : null,
    assessment_type_breakdown: 'assessment_type_breakdown' in performance
      ? performance.assessment_type_breakdown
      : undefined,
  };
}

export function toCbcPerformance(
  performance: CbcPerformanceSummary | CbcPerformance | null | undefined,
): CbcPerformance | null {
  if (!performance) return null;

  return {
    learner_count: performance.learner_count,
    result_counts: performance.result_counts,
    distribution_by_code: performance.distribution_by_code,
    average_weighted_score: performance.average_weighted_score,
    average_points: performance.average_points,
    missing_result_count: performance.missing_result_count,
    note: performance.note ?? null,
  };
}

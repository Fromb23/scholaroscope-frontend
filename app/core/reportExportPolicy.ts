import type { ReportExportFormat } from '@/app/core/types/reporting';

export type ReportExportType =
  | 'learner_term_progress'
  | 'learner_subject'
  | 'learner_overview'
  | 'admin_student_report'
  | 'teacher_performance'
  | 'admin_overview'
  | 'admin_cohort'
  | 'admin_subject'
  | 'class_subject'
  | 'attendance_scope'
  | 'learner_roster'
  | 'scheme_of_work';

export const REPORT_EXPORT_FORMATS = {
  learner_term_progress: ['pdf'],
  learner_subject: ['pdf'],
  learner_overview: ['pdf'],
  admin_student_report: ['pdf'],
  teacher_performance: ['pdf'],
  admin_overview: ['pdf'],
  admin_cohort: ['pdf', 'xlsx'],
  admin_subject: ['pdf', 'xlsx'],
  class_subject: ['pdf', 'xlsx'],
  attendance_scope: ['pdf', 'xlsx'],
  learner_roster: ['xlsx'],
  scheme_of_work: ['docx'],
} as const satisfies Record<ReportExportType, readonly ReportExportFormat[]>;

export function allowedReportExportFormats(reportType: ReportExportType): readonly ReportExportFormat[] {
  return REPORT_EXPORT_FORMATS[reportType];
}

export function reportExportFormatAllowed(
  reportType: ReportExportType,
  format: ReportExportFormat,
): boolean {
  return allowedReportExportFormats(reportType).includes(format);
}

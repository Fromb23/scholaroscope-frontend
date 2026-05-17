'use client';

import { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Download,
  FileText,
  TrendingUp,
  User,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { CurriculumSubjectReportCard } from '@/app/core/components/reports/CurriculumSubjectReportCard';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { useStudentReportCard, useLongitudinalStudent } from '@/app/core/hooks/useReporting';
import { useStudents } from '@/app/core/hooks/useStudents';
import { useTerms } from '@/app/core/hooks/useAcademic';
import {
  formatPercent,
  getAttendancePercentage,
  resolveCbcStudentResult,
  resolveGenericStudentResult,
} from '@/app/core/lib/reportingPresentation';
import type { ExportPayload } from '@/app/types/export';

type ViewMode = 'report-card' | 'longitudinal';

export function StudentsReportPage() {
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('report-card');
  const [exportOpen, setExportOpen] = useState(false);

  const { students, loading: studentsLoading } = useStudents();
  const { terms, loading: termsLoading } = useTerms();
  const { reportCard, loading: reportLoading, error: reportError } = useStudentReportCard(selectedStudent, selectedTerm);
  const { data: longitudinal, loading: longLoading, error: longError } = useLongitudinalStudent(selectedStudent);

  const showReport = viewMode === 'report-card' && selectedStudent && selectedTerm;
  const showLong = viewMode === 'longitudinal' && selectedStudent;
  const isLoading = showReport ? reportLoading : showLong ? longLoading : false;
  const visibleError = viewMode === 'report-card' ? reportError : longError;

  const exportPayload = useMemo<ExportPayload | null>(() => {
    if (viewMode === 'report-card' && reportCard) {
      return {
        title: `${reportCard.student.name} Report Card`,
        subtitle: reportCard.term
          ? `${reportCard.term.name} · ${reportCard.term.academic_year}`
          : 'Learner report card',
        metadata: {
          cohort: reportCard.student.cohort ?? '—',
          term: reportCard.term?.name ?? '—',
          genericAverage: formatPercent(reportCard.overall.generic_average_score),
          cbcAverageWeightedScore: formatPercent(reportCard.overall.cbc_average_weighted_score),
          averageAttendance: formatPercent(reportCard.overall.average_attendance),
          generatedAt: new Date().toLocaleString(),
        },
        columns: [
          { key: 'subject', label: 'Subject', width: 24 },
          { key: 'subject_code', label: 'Code', width: 10 },
          { key: 'reporting_source', label: 'Reporting Source', width: 18 },
          { key: 'status', label: 'Result Status', width: 16 },
          { key: 'generic_score', label: 'Generic Score', format: 'percentage', width: 14, align: 'right' as const },
          { key: 'generic_grade', label: 'Generic Grade', width: 14 },
          { key: 'cbc_weighted_score', label: 'CBC Weighted Score', format: 'percentage', width: 18, align: 'right' as const },
          { key: 'cbc_code', label: 'CBC Code', width: 12 },
          { key: 'cbc_points', label: 'CBC Points', format: 'number', width: 12, align: 'right' as const },
          { key: 'attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
          { key: 'assessments', label: 'Assessment Completion', width: 20 },
        ],
        rows: reportCard.subjects.map((subject) => {
          const genericResult = resolveGenericStudentResult(subject.generic);
          const cbcResult = resolveCbcStudentResult(subject.cbc);
          return {
            subject: subject.cohort_subject.subject_name,
            subject_code: subject.cohort_subject.subject_code,
            reporting_source: subject.reporting_source,
            status: subject.status ?? cbcResult?.result_status ?? genericResult.gradeStatus ?? '—',
            generic_score: genericResult.finalScore ?? genericResult.averageScore ?? genericResult.weightedAverage,
            generic_grade: genericResult.letterGrade ?? '—',
            cbc_weighted_score: cbcResult?.weighted_score ?? null,
            cbc_code: cbcResult?.cbc_code ?? '—',
            cbc_points: cbcResult?.cbc_points ?? null,
            attendance: getAttendancePercentage(subject.attendance),
            assessments: subject.assessment_completion
              ? `${subject.assessment_completion.completed_scores ?? subject.assessment_completion.finalized_assessments}/${subject.assessment_completion.total_assessments}`
              : '—',
          };
        }),
        fileName: `student-report-card-${reportCard.student.admission_number.toLowerCase()}`,
        includeMetadata: true,
        includeTimestamp: true,
        sheetName: 'Report Card',
        freezeHeader: true,
        autoFilter: true,
        orientation: 'landscape' as const,
      };
    }

    if (viewMode === 'longitudinal' && longitudinal && longitudinal.terms.length > 0) {
      return {
        title: `${longitudinal.student.name} Longitudinal Report`,
        subtitle: `${longitudinal.student.admission_number} · generic numeric compatibility`,
        metadata: {
          generatedAt: new Date().toLocaleString(),
        },
        columns: [
          { key: 'term', label: 'Term', width: 18 },
          { key: 'academic_year', label: 'Academic Year', width: 18 },
          { key: 'subject', label: 'Subject', width: 24 },
          { key: 'weighted_average', label: 'Generic Numeric Average', format: 'percentage', width: 18, align: 'right' as const },
          { key: 'final_grade', label: 'Generic Grade', width: 12 },
          { key: 'attendance_rate', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
          { key: 'assessments', label: 'Assessments', format: 'number', width: 14, align: 'right' as const },
        ],
        rows: longitudinal.terms.flatMap((termData) => {
          const attendanceByCode = new Map(
            termData.attendance.map((item) => [item.subject_code, item])
          );
          return termData.grades.map((grade) => ({
            term: termData.term.name,
            academic_year: termData.term.academic_year,
            subject: grade.subject_name,
            weighted_average: grade.weighted_average,
            final_grade: grade.final_grade,
            attendance_rate: attendanceByCode.get(grade.subject_code)?.attendance_percentage ?? null,
            assessments: grade.total_assessments,
          }));
        }),
        fileName: `student-longitudinal-report-${longitudinal.student.admission_number.toLowerCase()}`,
        includeMetadata: true,
        includeTimestamp: true,
        sheetName: 'Longitudinal',
        freezeHeader: true,
        autoFilter: true,
        orientation: 'landscape' as const,
      };
    }

    return null;
  }, [longitudinal, reportCard, viewMode]);

  return (
    <AdminReportAccessGate>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Student Reports</h1>
            <p className="mt-1 text-gray-500">
              Curriculum-aware learner report cards with generic compatibility kept secondary.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {exportPayload && (
              <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                <Download className="mr-1.5 h-4 w-4" />
                Export
              </Button>
            )}
            <User className="h-7 w-7 text-blue-600" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'report-card' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('report-card')}
          >
            <BookOpen className="mr-1.5 h-4 w-4" />
            Report Card
          </Button>
          <Button
            variant={viewMode === 'longitudinal' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('longitudinal')}
          >
            <TrendingUp className="mr-1.5 h-4 w-4" />
            Progress Over Time
          </Button>
        </div>

        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Student"
              value={selectedStudent?.toString() ?? ''}
              onChange={(e) => setSelectedStudent(e.target.value ? Number(e.target.value) : null)}
              disabled={studentsLoading}
              options={[
                { value: '', label: 'Select student…' },
                ...students.map((student) => ({
                  value: String(student.id),
                  label: `${student.full_name} (${student.admission_number})`,
                })),
              ]}
            />
            {viewMode === 'report-card' && (
              <Select
                label="Term"
                value={selectedTerm?.toString() ?? ''}
                onChange={(e) => setSelectedTerm(e.target.value ? Number(e.target.value) : null)}
                disabled={termsLoading}
                options={[
                  { value: '', label: 'Select term…' },
                  ...terms.map((term) => ({
                    value: String(term.id),
                    label: `${term.academic_year_name} — ${term.name}`,
                  })),
                ]}
              />
            )}
          </div>
        </Card>

        {!selectedStudent && (
          <Card>
            <div className="py-16 text-center">
              <User className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">No student selected</p>
              <p className="mt-1 text-xs text-gray-500">
                Select a learner above to view a report.
              </p>
            </div>
          </Card>
        )}

        {isLoading && selectedStudent && <LoadingSpinner />}
        {visibleError && <ErrorBanner message={visibleError} onDismiss={() => {}} />}

        {showReport && !reportLoading && reportCard && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{reportCard.student.name}</h2>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {reportCard.student.admission_number}
                    {reportCard.student.cohort && ` · ${reportCard.student.cohort}`}
                    {reportCard.student.level && ` · ${reportCard.student.level}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Term</p>
                  <p className="font-semibold text-gray-900">{reportCard.term?.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">{reportCard.term?.academic_year ?? '—'}</p>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                title="Generic Numeric Average"
                value={formatPercent(reportCard.overall.generic_average_score)}
                icon={TrendingUp}
                color="blue"
              />
              <StatsCard
                title="CBC Weighted Score"
                value={formatPercent(reportCard.overall.cbc_average_weighted_score)}
                icon={FileText}
                color="green"
              />
              <StatsCard
                title="Average Attendance"
                value={formatPercent(reportCard.overall.average_attendance)}
                icon={Calendar}
                color="indigo"
              />
              <StatsCard
                title="Subjects"
                value={reportCard.overall.total_subjects}
                icon={BookOpen}
                color="purple"
              />
            </div>

            {reportCard.overall.average_score_note && (
              <p className="text-sm text-gray-500">{reportCard.overall.average_score_note}</p>
            )}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Subject Reporting</h3>
                <Badge variant="blue">
                  {reportCard.subjects.length}
                  {' '}subject{reportCard.subjects.length === 1 ? '' : 's'}
                </Badge>
              </div>
              {reportCard.subjects.length === 0 ? (
                <Card>
                  <div className="py-12 text-center">
                    <FileText className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      No curriculum-aware subject reporting is available for this learner yet.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {reportCard.subjects.map((subject) => (
                    <CurriculumSubjectReportCard
                      key={subject.cohort_subject.id}
                      heading={subject.cohort_subject.subject_name}
                      subheading={`${subject.cohort_subject.subject_code} · ${subject.performance_source}`}
                      reportingSource={subject.reporting_source}
                      performanceSource={subject.performance_source}
                      curriculumType={subject.curriculum_type}
                      status={subject.status}
                      note={subject.note}
                      attendance={subject.attendance}
                      assessmentCompletion={subject.assessment_completion}
                      genericStudent={subject.generic}
                      cbcStudent={subject.cbc}
                    />
                  ))}
                </div>
              )}
            </div>

            {reportCard.grades.length > 0 && (
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Generic Compatibility Payload</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      `grades` and `legacy_grades` remain available for generic numeric compatibility only.
                    </p>
                  </div>
                  <Badge variant="default">{reportCard.grades.length} generic rows</Badge>
                </div>
              </Card>
            )}
          </div>
        )}

        {showLong && !longLoading && longitudinal && (
          <div className="space-y-4">
            <Card>
              <h2 className="font-semibold text-gray-900">{longitudinal.student.name}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {longitudinal.student.admission_number} · generic numeric compatibility
              </p>
            </Card>

            {longitudinal.terms.length === 0 ? (
              <Card>
                <div className="py-12 text-center">
                  <TrendingUp className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No term data available yet.</p>
                </div>
              </Card>
            ) : (
              longitudinal.terms.map((termData) => (
                <Card key={termData.term.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-semibold text-gray-900">{termData.term.name}</p>
                      <p className="text-xs text-gray-500">{termData.term.academic_year}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {termData.grades.map((grade) => (
                      <div key={grade.id} className="rounded-lg border border-gray-200 px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{grade.subject_name}</p>
                        <p className="mt-2 text-lg font-semibold text-blue-600">
                          {formatPercent(grade.weighted_average)}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Generic grade: {grade.final_grade || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {showReport && !reportLoading && !reportCard && (
          <Card>
            <div className="py-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No report card found for this learner and term.
              </p>
            </div>
          </Card>
        )}

        {exportPayload && (
          <ExportModal
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            payload={exportPayload}
            defaultFormat="excel"
            title="Export Student Report"
          />
        )}
      </div>
    </AdminReportAccessGate>
  );
}

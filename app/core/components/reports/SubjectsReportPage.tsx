'use client';

import { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { useSubjectAnalysis } from '@/app/core/hooks/useReporting';
import { useTerms, useSubjects } from '@/app/core/hooks/useAcademic';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { CurriculumSubjectReportCard } from '@/app/core/components/reports/CurriculumSubjectReportCard';
import { formatNumber, formatPercent } from '@/app/core/lib/reportingPresentation';
import type { ExportPayload } from '@/app/types/export';

export function SubjectsReportPage() {
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const { terms, loading: termsLoading } = useTerms();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const { analysis, loading, error } = useSubjectAnalysis(selectedTerm, selectedSubject);

  const reportingCounts = useMemo(() => {
    return (analysis?.cohort_subjects ?? []).reduce<Record<string, number>>((acc, item) => {
      acc[item.reporting_source] = (acc[item.reporting_source] ?? 0) + 1;
      return acc;
    }, {});
  }, [analysis]);

  const exportPayload = useMemo<ExportPayload | null>(() => {
    if (!analysis) return null;

    return {
      title: `${analysis.subject.name} Subject Report`,
      subtitle: analysis.term
        ? `${analysis.subject.code} · ${analysis.term.name}`
        : analysis.subject.code,
      metadata: {
        term: analysis.term?.name ?? 'All terms',
        academicYear: analysis.term?.academic_year ?? '—',
        averageScore: formatPercent(analysis.average_score),
        generatedAt: new Date().toLocaleString(),
      },
      columns: [
        { key: 'cohort', label: 'Cohort', width: 20 },
        { key: 'academic_year', label: 'Academic Year', width: 16 },
        { key: 'reporting_source', label: 'Reporting Source', width: 18 },
        { key: 'status', label: 'Status', width: 16 },
        { key: 'learners', label: 'Learners', format: 'number', width: 12, align: 'right' as const },
        { key: 'generic_average', label: 'Generic Numeric Average', format: 'percentage', width: 18, align: 'right' as const },
        { key: 'cbc_weighted_score', label: 'CBC Weighted Score', format: 'percentage', width: 18, align: 'right' as const },
        { key: 'attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
      ],
      rows: analysis.cohort_subjects.map((item) => ({
        cohort: item.cohort.name,
        academic_year: item.cohort.academic_year,
        reporting_source: item.reporting_source,
        status: item.status ?? '—',
        learners: item.active_learner_count,
        generic_average: item.generic_performance?.average_score ?? item.average_grade ?? item.average_score,
        cbc_weighted_score: item.cbc_performance?.average_weighted_score ?? null,
        attendance: item.average_attendance,
      })),
      fileName: `subject-report-${analysis.subject.name.toLowerCase().replace(/\s+/g, '-')}`,
      includeMetadata: true,
      includeTimestamp: true,
      sheetName: 'Subject Report',
      freezeHeader: true,
      autoFilter: true,
      orientation: 'landscape' as const,
    };
  }, [analysis]);

  return (
    <AdminReportAccessGate>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Subject Reports</h1>
            <p className="mt-1 text-gray-500">
              Subject reporting grouped by cohort subject and backend reporting source.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {exportPayload && (
              <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                <Download className="mr-1.5 h-4 w-4" />
                Export
              </Button>
            )}
            <FileText className="h-7 w-7 text-green-600" />
          </div>
        </div>

        <Card>
          <div className="grid gap-4 md:grid-cols-2">
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
            <Select
              label="Subject"
              value={selectedSubject?.toString() ?? ''}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
              disabled={subjectsLoading}
              options={[
                { value: '', label: 'Select subject…' },
                ...subjects.map((subject) => ({
                  value: String(subject.id),
                  label: `${subject.name} (${subject.code})`,
                })),
              ]}
            />
          </div>
        </Card>

        {error && <ErrorBanner message={error} onDismiss={() => {}} />}
        {loading && <LoadingSpinner />}

        {!loading && (!selectedTerm || !selectedSubject) && (
          <Card>
            <div className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                Select a term and subject to view the report.
              </p>
            </div>
          </Card>
        )}

        {!loading && analysis && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{analysis.subject.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">{analysis.subject.code}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {analysis.term?.name && <Badge variant="blue">{analysis.term.name}</Badge>}
                  <Badge variant="default">
                    {analysis.cohort_subjects.length} cohort subjects
                  </Badge>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard title="Generic Cohort Subjects" value={reportingCounts.generic ?? 0} icon={FileText} color="blue" />
              <StatsCard title="CBC Cohort Subjects" value={reportingCounts.cbc ?? 0} icon={FileText} color="green" />
              <StatsCard title="Pending" value={reportingCounts.cambridge_pending ?? 0} icon={FileText} color="yellow" />
              <StatsCard title="Unsupported" value={reportingCounts.unsupported ?? 0} icon={FileText} color="orange" />
            </div>

            {(analysis.average_score != null || analysis.average_score_note) && (
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Average Score Context</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {analysis.average_score_note ?? 'Use cohort-subject reporting source cards below for curriculum-specific performance.'}
                    </p>
                  </div>
                  <Badge variant="blue">{formatPercent(analysis.average_score)}</Badge>
                </div>
              </Card>
            )}

            {analysis.cohort_subjects.length === 0 ? (
              <Card>
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    No cohort subject data is available for this selection.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {analysis.cohort_subjects.map((item) => (
                  <CurriculumSubjectReportCard
                    key={item.cohort_subject.id}
                    heading={item.cohort.name}
                    subheading={`${item.cohort.level} · ${item.cohort_subject.subject_code} · ${item.assigned_instructor?.name ?? 'Unassigned instructor'}`}
                    reportingSource={item.reporting_source}
                    performanceSource={item.performance_source}
                    curriculumType={item.curriculum_type}
                    status={item.status}
                    note={item.note}
                    learnerCount={item.active_learner_count}
                    averageAttendance={item.average_attendance}
                    coverage={item.coverage}
                    assessmentCompletion={item.assessment_completion}
                    genericPerformance={item.generic_performance}
                    cbcPerformance={item.cbc_performance}
                    averageGrade={item.average_grade}
                    averageGradeNote={item.average_grade_note ?? item.average_score_note}
                  />
                ))}
              </div>
            )}

            {analysis.assessment_type_breakdown.length > 0 && (
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Assessment Type Breakdown</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Assessment facts remain separate from curriculum-specific result interpretation.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {analysis.assessment_type_breakdown.map((item) => (
                    <div key={item.assessment_type} className="rounded-lg border border-gray-200 px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{item.assessment_type}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatPercent(item.average_score)} average
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatNumber(item.total_assessments, 0)} assessments
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {!loading && selectedTerm && selectedSubject && !analysis && (
          <Card>
            <div className="py-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No subject data for this selection.</p>
            </div>
          </Card>
        )}

        {exportPayload && (
          <ExportModal
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            payload={exportPayload}
            defaultFormat="excel"
            title="Export Subject Report"
          />
        )}
      </div>
    </AdminReportAccessGate>
  );
}

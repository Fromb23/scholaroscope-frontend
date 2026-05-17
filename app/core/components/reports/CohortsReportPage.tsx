'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Calendar, Download, Users } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { useClassSummary } from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { CurriculumSubjectReportCard } from '@/app/core/components/reports/CurriculumSubjectReportCard';
import {
  formatNumber,
  formatPercent,
} from '@/app/core/lib/reportingPresentation';
import type { ExportPayload } from '@/app/types/export';

export function CohortsReportPage() {
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const { terms, loading: termsLoading } = useTerms();
  const { cohorts, loading: cohortsLoading } = useCohorts();
  const { summary, loading, error } = useClassSummary(selectedTerm, selectedCohort);

  const reportingCounts = useMemo(() => {
    return (summary?.cohort_subjects ?? []).reduce<Record<string, number>>((acc, item) => {
      acc[item.reporting_source] = (acc[item.reporting_source] ?? 0) + 1;
      return acc;
    }, {});
  }, [summary]);

  const exportPayload = useMemo<ExportPayload | null>(() => {
    if (!summary) return null;

    return {
      title: `${summary.cohort.name} Cohort Report`,
      subtitle: summary.term
        ? `${summary.cohort.level} · ${summary.term.name}`
        : summary.cohort.level,
      metadata: {
        cohort: summary.cohort.name,
        academicYear: summary.cohort.academic_year,
        term: summary.term?.name ?? 'All terms',
        genericAverage: formatPercent(summary.average_grade),
        averageAttendance: formatPercent(summary.average_attendance),
        generatedAt: new Date().toLocaleString(),
      },
      columns: [
        { key: 'subject', label: 'Subject', width: 24 },
        { key: 'subject_code', label: 'Code', width: 10 },
        { key: 'reporting_source', label: 'Reporting Source', width: 18 },
        { key: 'status', label: 'Status', width: 16 },
        { key: 'learners', label: 'Learners', format: 'number', width: 12, align: 'right' as const },
        { key: 'generic_average', label: 'Generic Numeric Average', format: 'percentage', width: 18, align: 'right' as const },
        { key: 'cbc_weighted_score', label: 'CBC Weighted Score', format: 'percentage', width: 18, align: 'right' as const },
        { key: 'attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
      ],
      rows: summary.cohort_subjects.map((item) => ({
        subject: item.cohort_subject.subject_name,
        subject_code: item.cohort_subject.subject_code,
        reporting_source: item.reporting_source,
        status: item.status ?? '—',
        learners: item.active_learner_count,
        generic_average: item.generic_performance?.average_score ?? item.average_grade,
        cbc_weighted_score: item.cbc_performance?.average_weighted_score ?? null,
        attendance: item.average_attendance,
      })),
      fileName: `cohort-report-${summary.cohort.name.toLowerCase().replace(/\s+/g, '-')}`,
      includeMetadata: true,
      includeTimestamp: true,
      sheetName: 'Cohort Report',
      freezeHeader: true,
      autoFilter: true,
      orientation: 'landscape' as const,
    };
  }, [summary]);

  return (
    <AdminReportAccessGate>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Cohort Reports</h1>
            <p className="mt-1 text-gray-500">
              Cohort subject reporting driven by backend reporting source.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {exportPayload && (
              <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                <Download className="mr-1.5 h-4 w-4" />
                Export
              </Button>
            )}
            <BookOpen className="h-7 w-7 text-purple-600" />
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
              label="Cohort"
              value={selectedCohort?.toString() ?? ''}
              onChange={(e) => setSelectedCohort(e.target.value ? Number(e.target.value) : null)}
              disabled={cohortsLoading}
              options={[
                { value: '', label: 'Select cohort…' },
                ...cohorts.map((cohort) => ({
                  value: String(cohort.id),
                  label: `${cohort.name} — ${cohort.level}`,
                })),
              ]}
            />
          </div>
        </Card>

        {error && <ErrorBanner message={error} onDismiss={() => {}} />}
        {loading && <LoadingSpinner />}

        {!loading && (!selectedTerm || !selectedCohort) && (
          <Card>
            <div className="py-16 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                Select a term and cohort to view the report.
              </p>
            </div>
          </Card>
        )}

        {!loading && summary && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{summary.cohort.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {summary.cohort.level} · {summary.cohort.curriculum}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Badge variant="purple">{summary.learner_count} learners</Badge>
                  {summary.term?.name && <Badge variant="blue">{summary.term.name}</Badge>}
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard title="Total Learners" value={summary.learner_count} icon={Users} color="blue" />
              <StatsCard title="Average Attendance" value={formatPercent(summary.average_attendance)} icon={Calendar} color="indigo" />
              <StatsCard title="Generic Subjects" value={reportingCounts.generic ?? 0} icon={BookOpen} color="green" />
              <StatsCard title="CBC Subjects" value={reportingCounts.cbc ?? 0} icon={BookOpen} color="purple" />
            </div>

            {summary.average_grade != null && (
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Generic Numeric Average</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {summary.average_grade_note ?? 'This value reflects generic numeric reporting only.'}
                    </p>
                  </div>
                  <Badge variant="blue">{formatPercent(summary.average_grade)}</Badge>
                </div>
              </Card>
            )}

            {summary.cohort_subjects.length === 0 ? (
              <Card>
                <div className="py-12 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    No cohort subject reporting is available for this selection.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {summary.cohort_subjects.map((item) => (
                  <CurriculumSubjectReportCard
                    key={item.cohort_subject.id}
                    heading={item.cohort_subject.subject_name}
                    subheading={`${item.cohort_subject.subject_code} · ${item.assigned_instructor?.name ?? 'Unassigned instructor'}`}
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
                    averageGradeNote={item.average_grade_note}
                  />
                ))}
              </div>
            )}

            {summary.cohort_summary && (reportingCounts.generic ?? 0) > 0 && (
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Generic Numeric Distribution</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Generic compatibility snapshot only. CBC results are not folded into A/B/C/D/E bands.
                    </p>
                  </div>
                  <Badge variant="default">
                    {formatNumber(summary.cohort_summary.total_students, 0)} records
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <DistributionMetric label="A" value={summary.cohort_summary.grade_a_count} />
                  <DistributionMetric label="B" value={summary.cohort_summary.grade_b_count} />
                  <DistributionMetric label="C" value={summary.cohort_summary.grade_c_count} />
                  <DistributionMetric label="D" value={summary.cohort_summary.grade_d_count} />
                  <DistributionMetric label="E" value={summary.cohort_summary.grade_e_count} />
                </div>
              </Card>
            )}
          </div>
        )}

        {!loading && selectedTerm && selectedCohort && !summary && (
          <Card>
            <div className="py-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No data available for this cohort and term.
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
            title="Export Cohort Report"
          />
        )}
      </div>
    </AdminReportAccessGate>
  );
}

function DistributionMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

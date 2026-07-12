'use client';

import { useMemo, useState } from 'react';
import { ClipboardCheck, Download, PieChart } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { useAssessmentTypeSummaries } from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { CurriculumSubjectReportCard } from '@/app/core/components/reports/CurriculumSubjectReportCard';
import {
  formatNumber,
  formatPercent,
} from '@/app/core/lib/reportingPresentation';
import type { ExportPayload } from '@/app/types/export';

export function AssessmentsReportPage() {
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const { terms, loading: termsLoading } = useTerms();
  const { summaries, loading, error } = useAssessmentTypeSummaries({
    term: selectedTerm ?? undefined,
  });

  const totalAssessments = summaries.reduce((sum, item) => sum + item.total_assessments, 0);

  const exportPayload = useMemo<ExportPayload | null>(() => {
    if (!selectedTerm || summaries.length === 0) return null;

    return {
      title: 'Assessment Report',
      subtitle: 'Assessment completion and curriculum-aware performance',
      metadata: {
        term: terms.find((term) => term.id === selectedTerm)?.name ?? 'Selected term',
        generatedAt: new Date().toLocaleString(),
      },
      columns: [
        { key: 'assessment_type', label: 'Assessment Type', width: 18 },
        { key: 'subject_name', label: 'Subject', width: 22 },
        { key: 'cohort_name', label: 'Cohort', width: 18 },
        { key: 'reporting_source', label: 'Reporting Source', width: 18 },
        { key: 'status', label: 'Status', width: 16 },
        { key: 'total_assessments', label: 'Assessments', format: 'number', width: 14, align: 'right' as const },
        { key: 'missing_scores', label: 'Missing Scores', format: 'number', width: 14, align: 'right' as const },
        { key: 'generic_average', label: 'Generic Numeric Average', format: 'percentage', width: 18, align: 'right' as const },
        { key: 'cbc_weighted_score', label: 'CBC Assessment Indicator', format: 'percentage', width: 22, align: 'right' as const },
      ],
      rows: summaries.map((summary) => ({
        assessment_type: summary.assessment_type,
        subject_name: summary.subject_name,
        cohort_name: summary.cohort_name,
        reporting_source: summary.reporting_source ?? 'unsupported',
        status: summary.status ?? '—',
        total_assessments: summary.total_assessments,
        missing_scores: summary.assessment_completion?.missing_scores_count ?? null,
        generic_average: summary.generic_performance?.average_score ?? summary.average_score,
        cbc_weighted_score: summary.cbc_performance?.average_weighted_score ?? null,
      })),
      fileName: 'assessment-report',
      includeMetadata: true,
      includeTimestamp: true,
      sheetName: 'Assessment Report',
      freezeHeader: true,
      autoFilter: true,
      orientation: 'landscape' as const,
    };
  }, [selectedTerm, summaries, terms]);

  return (
    <AdminReportAccessGate>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Assessment Reports</h1>
            <p className="mt-1 text-gray-500">
              Compatibility view for flat assessment breakdowns. For guided investigation,
              start from the learner, class, subject, or instructor report path first.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {exportPayload && (
              <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                <Download className="mr-1.5 h-4 w-4" />
                Export
              </Button>
            )}
            <PieChart className="h-7 w-7 text-orange-500" />
          </div>
        </div>

        {summaries.length > 0 && (
          <StatStrip mdColumns={2} xlColumns={4}>
            <StatsCard title="Assessment Records" value={summaries.length} icon={PieChart} color="blue" />
            <StatsCard title="Total Assessments" value={totalAssessments} icon={ClipboardCheck} color="green" />
            <StatsCard title="Subjects Covered" value={new Set(summaries.map((summary) => summary.subject_name)).size} icon={PieChart} color="purple" />
            <StatsCard title="Cohorts Covered" value={new Set(summaries.map((summary) => summary.cohort_name)).size} icon={PieChart} color="orange" />
          </StatStrip>
        )}

        <Card>
          <Select
            label="Select Term"
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
        </Card>

        {error && <ErrorBanner message={error} onDismiss={() => {}} />}
        {loading && <LoadingSpinner message="Loading assessment report..." />}

        {!loading && !selectedTerm && (
          <Card>
            <div className="py-16 text-center">
              <PieChart className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">Select a term to view assessment data.</p>
            </div>
          </Card>
        )}

        {!loading && selectedTerm && summaries.length > 0 && (
          <div className="grid gap-4">
            {summaries.map((summary) => (
              <CurriculumSubjectReportCard
                key={summary.id}
                heading={summary.subject_name}
                subheading={`${summary.cohort_name} · ${summary.assessment_type} · ${formatNumber(summary.total_assessments, 0)} assessments`}
                reportingSource={summary.reporting_source ?? 'unsupported'}
                performanceSource={summary.performance_source ?? 'unsupported'}
                curriculumType={summary.curriculum_type}
                status={summary.status}
                note={summary.note}
                averageAttendance={summary.average_attendance}
                coverage={summary.coverage}
                assessmentCompletion={summary.assessment_completion ?? {
                  total_assessments: summary.total_assessments,
                  finalized_assessments: 0,
                  draft_assessments: 0,
                  active_assessments: 0,
                  missing_scores_count: 0,
                }}
                genericPerformance={summary.generic_performance}
                cbcPerformance={summary.cbc_performance}
                averageGrade={summary.average_score}
                averageGradeNote={
                  summary.reporting_source === 'generic'
                    ? 'Legacy average score applies only to generic numeric reporting.'
                    : null
                }
                footer={(
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">{summary.assessment_type}</Badge>
                    <Badge variant="blue">{formatPercent(summary.average_score)}</Badge>
                  </div>
                )}
              />
            ))}
          </div>
        )}

        {!loading && selectedTerm && summaries.length === 0 && (
          <Card>
            <div className="py-12 text-center">
              <PieChart className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No assessment data for this term.</p>
            </div>
          </Card>
        )}

        {exportPayload && (
          <ExportModal
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            payload={exportPayload}
            defaultFormat="excel"
            title="Export Assessment Report"
          />
        )}
      </div>
    </AdminReportAccessGate>
  );
}

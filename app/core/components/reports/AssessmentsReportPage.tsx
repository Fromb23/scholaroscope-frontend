'use client';

import { useState } from 'react';
import { ClipboardCheck, PieChart } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useAssessmentTypeSummaries } from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { CurriculumSubjectReportCard } from '@/app/core/components/reports/CurriculumSubjectReportCard';
import {
  formatNumber,
  formatPercent,
} from '@/app/core/lib/reportingPresentation';

export function AssessmentsReportPage() {
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);

  const { terms, loading: termsLoading } = useTerms();
  const { summaries, loading, error } = useAssessmentTypeSummaries({
    term: selectedTerm ?? undefined,
  });

  const totalAssessments = summaries.reduce((sum, item) => sum + item.total_assessments, 0);

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
          <PieChart className="h-7 w-7 text-orange-500" />
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

      </div>
    </AdminReportAccessGate>
  );
}

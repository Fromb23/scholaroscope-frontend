'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, Download, Users } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { useInstructorCohortSubjects } from '@/app/core/hooks/useReporting';
import { CurriculumSubjectReportCard } from '@/app/core/components/reports/CurriculumSubjectReportCard';
import {
  formatNumber,
  formatPercent,
  toCbcPerformance,
  toGenericPerformance,
} from '@/app/core/lib/reportingPresentation';
import type { ExportPayload } from '@/app/types/export';

function average(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === 'number');
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export default function InstructorCohortSubjectsReportPage() {
  const [exportOpen, setExportOpen] = useState(false);
  const { cohortSubjects, loading, error } = useInstructorCohortSubjects();

  const averageAttendance = average(cohortSubjects.map((item) => item.average_attendance));
  const reportingCounts = cohortSubjects.reduce<Record<string, number>>((acc, item) => {
    acc[item.reporting_source] = (acc[item.reporting_source] ?? 0) + 1;
    return acc;
  }, {});

  const exportPayload = useMemo<ExportPayload | null>(() => {
    if (cohortSubjects.length === 0) return null;

    return {
      title: 'My Cohort Subjects',
      subtitle: 'Assigned reporting scope',
      metadata: {
        totalCohortSubjects: String(cohortSubjects.length),
        averageAttendance: formatPercent(averageAttendance),
        generatedAt: new Date().toLocaleString(),
      },
      columns: [
        { key: 'cohort_name', label: 'Cohort', width: 20 },
        { key: 'subject_name', label: 'Subject', width: 24 },
        { key: 'subject_code', label: 'Code', width: 10 },
        { key: 'reporting_source', label: 'Reporting Source', width: 18 },
        { key: 'status', label: 'Status', width: 16 },
        { key: 'active_learner_count', label: 'Learners', format: 'number', width: 12, align: 'right' as const },
        { key: 'average_attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
        { key: 'session_count', label: 'Sessions', format: 'number', width: 12, align: 'right' as const },
        { key: 'generic_average', label: 'Generic Numeric Average', format: 'percentage', width: 18, align: 'right' as const },
        { key: 'cbc_weighted_score', label: 'CBC Weighted Score', format: 'percentage', width: 18, align: 'right' as const },
      ],
      rows: cohortSubjects.map((item) => ({
        ...item,
        generic_average: item.generic_summary?.average_score ?? item.generic_performance?.average_score ?? item.average_grade,
        cbc_weighted_score: item.cbc_summary?.average_weighted_score ?? item.cbc_performance?.average_weighted_score ?? null,
      })),
      fileName: 'my-cohort-subjects',
      includeMetadata: true,
      includeTimestamp: true,
      sheetName: 'Cohort Subjects',
      freezeHeader: true,
      autoFilter: true,
      orientation: 'landscape' as const,
    };
  }, [averageAttendance, cohortSubjects]);

  if (loading) return <LoadingSpinner message="Loading instructor class subject reports..." />;
  if (error) return <ErrorBanner message={error} onDismiss={() => {}} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Cohort Subjects</h1>
          <p className="mt-1 text-gray-500">
            Assigned cohort-subject reporting with curriculum-aware performance blocks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {exportPayload && (
            <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          )}
          <BookOpen className="h-7 w-7 text-green-600" />
        </div>
      </div>

      <StatStrip mdColumns={2} xlColumns={4}>
        <StatsCard title="Cohort Subjects" value={cohortSubjects.length} icon={BookOpen} color="blue" />
        <StatsCard title="Learners" value={cohortSubjects.reduce((sum, item) => sum + item.active_learner_count, 0)} icon={Users} color="green" />
        <StatsCard title="Average Attendance" value={formatPercent(averageAttendance)} icon={Users} color="indigo" />
        <StatsCard title="CBC Subjects" value={reportingCounts.cbc ?? 0} icon={BookOpen} color="purple" />
      </StatStrip>

      {cohortSubjects.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No assigned cohort subjects</p>
            <p className="mt-1 text-xs text-gray-500">
              This page only lists active cohort-subject assignments available in your reporting scope.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cohortSubjects.map((item) => (
            <CurriculumSubjectReportCard
              key={item.id}
              heading={`${item.cohort_name} — ${item.subject_name}`}
              subheading={`${item.subject_code} · ${item.academic_year}`}
              reportingSource={item.reporting_source}
              performanceSource={item.performance_source}
              curriculumType={item.curriculum_type}
              status={item.status}
              note={item.note}
              learnerCount={item.active_learner_count}
              averageAttendance={item.average_attendance}
              coverage={item.coverage}
              assessmentCompletion={item.assessment_completion}
              genericPerformance={toGenericPerformance(item.generic_performance ?? item.generic_summary)}
              cbcPerformance={toCbcPerformance(item.cbc_performance ?? item.cbc_summary)}
              averageGrade={item.average_grade}
              averageGradeNote={item.average_grade_note}
              actions={(
                <Link href={`/reports/instructor/cohort-subjects/${item.id}`}>
                  <Button variant="secondary" size="sm">Open report</Button>
                </Link>
              )}
              footer={(
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Sessions {formatNumber(item.session_count, 0)}</Badge>
                </div>
              )}
            />
          ))}
        </div>
      )}

      {exportPayload && (
        <ExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          payload={exportPayload}
          defaultFormat="excel"
          title="Export My Cohort Subjects"
        />
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, Download, FileBarChart, Calendar, Users } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { useInstructorOverview } from '@/app/core/hooks/useReporting';
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

export function InstructorReportsOverviewPage() {
  const [exportOpen, setExportOpen] = useState(false);
  const { overview, loading, error } = useInstructorOverview();

  const averageAttendance = average(overview?.assigned_cohort_subjects.map((item) => item.average_attendance) ?? []);
  const totalSessions = (overview?.assigned_cohort_subjects ?? []).reduce(
    (sum, item) => sum + (item.session_count ?? 0),
    0,
  );
  const reportingCounts = (overview?.assigned_cohort_subjects ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.reporting_source] = (acc[item.reporting_source] ?? 0) + 1;
    return acc;
  }, {});

  const exportPayload = useMemo<ExportPayload | null>(() => {
    if (!overview) return null;

    return {
      title: 'Instructor Overview',
      subtitle: 'Assigned reporting scope',
      metadata: {
        assignedCohortSubjects: String(overview.total_assigned_cohort_subjects),
        visibleLearners: String(overview.total_visible_learners),
        averageAttendance: formatPercent(averageAttendance),
        totalSessions: String(totalSessions),
        generatedAt: new Date().toLocaleString(),
      },
      columns: [
        { key: 'cohort_name', label: 'Cohort', width: 20 },
        { key: 'subject_name', label: 'Subject', width: 24 },
        { key: 'reporting_source', label: 'Reporting Source', width: 18 },
        { key: 'status', label: 'Status', width: 16 },
        { key: 'active_learner_count', label: 'Learners', format: 'number', width: 12, align: 'right' as const },
        { key: 'average_attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
        { key: 'session_count', label: 'Sessions', format: 'number', width: 12, align: 'right' as const },
        { key: 'completed_session_count', label: 'Completed', format: 'number', width: 12, align: 'right' as const },
        { key: 'generic_average', label: 'Generic Numeric Average', format: 'percentage', width: 18, align: 'right' as const },
        { key: 'cbc_weighted_score', label: 'CBC Weighted Score', format: 'percentage', width: 18, align: 'right' as const },
      ],
      rows: overview.assigned_cohort_subjects.map((item) => ({
        ...item,
        generic_average: item.generic_summary?.average_score ?? item.generic_performance?.average_score ?? item.average_grade,
        cbc_weighted_score: item.cbc_summary?.average_weighted_score ?? item.cbc_performance?.average_weighted_score ?? null,
      })),
      fileName: 'instructor-overview',
      includeMetadata: true,
      includeTimestamp: true,
      sheetName: 'Instructor Overview',
      freezeHeader: true,
      autoFilter: true,
      orientation: 'landscape' as const,
    };
  }, [averageAttendance, overview, totalSessions]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onDismiss={() => {}} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Class Progress</h1>
          <p className="mt-1 text-gray-500">
            Review attendance, teaching coverage, and learner progress across your assigned classes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {exportPayload && (
            <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          )}
          <FileBarChart className="h-7 w-7 text-green-600" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Assigned Cohort Subjects" value={overview?.total_assigned_cohort_subjects ?? 0} icon={BookOpen} color="blue" />
        <StatsCard title="Visible Learners" value={overview?.total_visible_learners ?? 0} icon={Users} color="green" />
        <StatsCard title="Average Attendance" value={formatPercent(averageAttendance)} icon={Calendar} color="indigo" />
        <StatsCard title="Total Sessions" value={totalSessions} icon={Calendar} color="purple" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Generic Subjects" value={reportingCounts.generic ?? 0} icon={BookOpen} color="blue" />
        <StatsCard title="CBC Subjects" value={reportingCounts.cbc ?? 0} icon={BookOpen} color="green" />
        <StatsCard title="Pending" value={reportingCounts.cambridge_pending ?? 0} icon={BookOpen} color="yellow" />
        <StatsCard title="Unsupported" value={reportingCounts.unsupported ?? 0} icon={BookOpen} color="orange" />
      </div>

      {!overview || overview.assigned_cohort_subjects.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No class progress available yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Your teaching load is not assigned yet. Once your administrator assigns classes or subjects, progress tools will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Assigned Cohort Subjects</h2>
            <Link href="/reports/instructor/cohort-subjects">
              <Button variant="secondary" size="sm">View All</Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {overview.assigned_cohort_subjects.map((item) => (
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
                    <Button variant="ghost" size="sm">Open</Button>
                  </Link>
                )}
                footer={(
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">Sessions {formatNumber(item.session_count, 0)}</Badge>
                    <Badge variant="blue">Completed {formatNumber(item.completed_session_count, 0)}</Badge>
                  </div>
                )}
              />
            ))}
          </div>
        </div>
      )}

      {exportPayload && (
        <ExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          payload={exportPayload}
          defaultFormat="excel"
          title="Export Instructor Overview"
        />
      )}
    </div>
  );
}

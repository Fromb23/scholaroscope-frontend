'use client';

import Link from 'next/link';
import { BookOpen, Users } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useInstructorCohortSubjects } from '@/app/core/hooks/useReporting';
import { CurriculumSubjectReportCard } from '@/app/core/components/reports/CurriculumSubjectReportCard';
import {
  formatNumber,
  formatPercent,
  toCbcPerformance,
  toGenericPerformance,
} from '@/app/core/lib/reportingPresentation';

function average(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === 'number');
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export default function InstructorCohortSubjectsReportPage() {
  const { cohortSubjects, loading, error } = useInstructorCohortSubjects();

  const averageAttendance = average(cohortSubjects.map((item) => item.average_attendance));
  const reportingCounts = cohortSubjects.reduce<Record<string, number>>((acc, item) => {
    acc[item.reporting_source] = (acc[item.reporting_source] ?? 0) + 1;
    return acc;
  }, {});

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
        <BookOpen className="h-7 w-7 text-green-600" />
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
    </div>
  );
}

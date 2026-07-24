'use client';

import Link from 'next/link';
import {
  BookOpen,
  ClipboardList,
  FileBarChart,
  Calendar,
  Users,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { CardSkeleton, Skeleton, SkeletonStatCard } from '@/app/components/ui/loading';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useInstructorOverview } from '@/app/core/hooks/useReporting';
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

function InstructorReportsOverviewSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading instructor report overview">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-8 w-8" rounded="full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} lines={3} />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <SkeletonStatCard key={index} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} lines={4} />)}
      </div>
    </div>
  );
}

export function InstructorReportsOverviewPage() {
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

  if (loading) return <InstructorReportsOverviewSkeleton />;
  if (error) return <ErrorBanner message={error} onDismiss={() => {}} />;

  const reportCards = [
    {
      title: 'Learner Reports',
      description: 'Open learner subject and learner overall reports from your assigned classes.',
      href: '/reports/instructor/cohort-subjects',
      actionLabel: 'Open Classes',
      icon: Users,
    },
    {
      title: 'Subject Reports',
      description: 'Review subject-level performance and teaching activity by cohort subject.',
      href: '/reports/instructor/cohort-subjects',
      actionLabel: 'Open Subject Reports',
      icon: FileBarChart,
    },
    {
      title: 'Class Subject Reports',
      description: 'Choose a cohort subject, then open its class report with support lists and interventions.',
      href: '/reports/instructor/cohort-subjects',
      actionLabel: 'Choose Class',
      icon: BookOpen,
    },
    {
      title: 'Teacher Report',
      description: 'View teaching visibility, coverage, evidence, and reflection discipline in one report.',
      href: '/reports/instructor/teacher-report',
      actionLabel: 'Open Teacher Report',
      icon: ClipboardList,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Reports</h1>
          <p className="mt-1 text-gray-500">
            Open summary-first reports for learners, classes, subjects, and your own teaching visibility.
          </p>
        </div>
        <FileBarChart className="h-7 w-7 text-green-600" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-gray-900">{item.title}</h2>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <Link href={item.href}>
                  <Button variant="secondary" size="sm">{item.actionLabel}</Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <StatStrip mdColumns={2} xlColumns={4}>
        <StatsCard title="Assigned Cohort Subjects" value={overview?.total_assigned_cohort_subjects ?? 0} icon={BookOpen} color="blue" />
        <StatsCard title="Visible Learners" value={overview?.total_visible_learners ?? 0} icon={Users} color="green" />
        <StatsCard title="Average Attendance" value={formatPercent(averageAttendance)} icon={Calendar} color="indigo" />
        <StatsCard title="Total Sessions" value={totalSessions} icon={Calendar} color="purple" />
      </StatStrip>

      <StatStrip mdColumns={2} xlColumns={4}>
        <StatsCard title="Generic Subjects" value={reportingCounts.generic ?? 0} icon={BookOpen} color="blue" />
        <StatsCard title="CBC Subjects" value={reportingCounts.cbc ?? 0} icon={BookOpen} color="green" />
        <StatsCard title="Pending" value={reportingCounts.cambridge_pending ?? 0} icon={BookOpen} color="yellow" />
        <StatsCard title="Unsupported" value={reportingCounts.unsupported ?? 0} icon={BookOpen} color="orange" />
      </StatStrip>

      {!overview || overview.assigned_cohort_subjects.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No reportable classes are available yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Your classes are not assigned yet. Once your administrator assigns classes or subjects, progress tools will appear here.
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
    </div>
  );
}

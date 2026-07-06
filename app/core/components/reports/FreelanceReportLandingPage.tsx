'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  ClipboardCheck,
  FileBarChart,
  Users,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { getAdminReportLandingSections } from '@/app/core/components/reports/reportHierarchy';
import { useInstructorOverview } from '@/app/core/hooks/useReporting';
import { formatPercent } from '@/app/core/lib/reportingPresentation';
import type { AppError } from '@/app/core/errors';
import type { InstructorOverview } from '@/app/core/types/reporting';

function average(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((value): value is number => typeof value === 'number');
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function totalAssessments(overview: InstructorOverview | null): number {
  return (overview?.assigned_cohort_subjects ?? []).reduce(
    (sum, item) => sum + (item.assessment_completion?.total_assessments ?? 0),
    0,
  );
}

export function getFreelanceReportLandingCards() {
  const primaryItems = getAdminReportLandingSections().primary;
  const learners = primaryItems.find((item) => item.key === 'learners');
  const classes = primaryItems.find((item) => item.key === 'classes');
  const subjects = primaryItems.find((item) => item.key === 'subjects');

  return [
    {
      key: 'learners',
      name: 'My learners',
      href: '/reports/students',
      description: learners?.description ?? 'Open learner reports in your teaching workspace.',
      icon: learners?.icon ?? Users,
    },
    {
      key: 'assessments',
      name: 'My assessments',
      href: '/reports/assessments',
      description: subjects?.description ?? 'Review assessment coverage and learner performance.',
      icon: ClipboardCheck,
    },
    {
      key: 'attendance',
      name: 'My attendance',
      href: '/reports/attendance',
      description: 'Review attendance from learner, class, subject, or class-subject context.',
      icon: Calendar,
    },
    {
      key: 'class-subjects',
      name: 'My class subjects',
      href: '/reports/instructor/cohort-subjects',
      description: classes?.description ?? 'Open class subject reports for your assigned teaching scope.',
      icon: classes?.icon ?? FileBarChart,
    },
  ];
}

export function FreelanceReportLandingContent({
  overview,
}: {
  overview: InstructorOverview | null;
}) {
  const averageAttendance = average(
    overview?.assigned_cohort_subjects.map((item) => item.average_attendance) ?? [],
  );
  const cards = getFreelanceReportLandingCards();

  return (
    <div className="space-y-8 max-w-full">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900">Your reporting workspace</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Open reports for the learners, assessments, attendance, and class subjects you manage.
          </p>
        </div>
        <BarChart3 className="h-7 w-7 shrink-0 text-green-600" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard
          title="Learners"
          value={overview?.total_visible_learners ?? 0}
          icon={Users}
          color="green"
        />
        <StatsCard
          title="Assessments"
          value={totalAssessments(overview)}
          icon={ClipboardCheck}
          color="blue"
        />
        <StatsCard
          title="Average Attendance"
          value={formatPercent(averageAttendance)}
          icon={Calendar}
          color="indigo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.key} href={card.href} className="group block">
              <Card className="h-full p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-green-50 p-3 text-green-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:text-gray-500" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-gray-900">{card.name}</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">{card.description}</p>
                <div className="mt-4">
                  <Button variant="secondary" size="sm">Open</Button>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function FreelanceReportLandingPage() {
  const { overview, loading, error } = useInstructorOverview();

  if (loading) {
    return <LoadingSpinner message="Loading your reporting workspace..." />;
  }

  if (error) {
    const reportError: AppError = {
      kind: 'report_not_ready',
      title: 'This report workspace is not ready yet.',
      message: error,
      retryable: true,
      severity: 'warning',
    };
    return <AppErrorBanner error={reportError} />;
  }

  return <FreelanceReportLandingContent overview={overview} />;
}

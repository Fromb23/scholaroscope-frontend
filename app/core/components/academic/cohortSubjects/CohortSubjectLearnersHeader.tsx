'use client';

import Link from 'next/link';
import { ArrowLeft, Download, UserPlus, Users } from 'lucide-react';
import { ActionMenu, type ActionMenuItem } from '@/app/components/ui/ActionMenu';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';

interface CohortSubjectLearnersStatsProps {
  enrolled: number;
  available: number;
  cohortTotal: number;
  instructorView: boolean;
}

export function CohortSubjectLearnersStats({
  enrolled,
  available,
  cohortTotal,
  instructorView,
}: CohortSubjectLearnersStatsProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2 text-xs md:hidden">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
          {enrolled} enrolled
        </span>
        {!instructorView ? (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
            {available} available
          </span>
        ) : null}
        <span className="rounded-full bg-gray-50 px-2.5 py-1 text-gray-500">
          {cohortTotal} cohort total
        </span>
      </div>

      {instructorView ? (
        <div className="hidden md:block">
          <Card className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Enrolled</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{enrolled}</p>
          </Card>
        </div>
      ) : (
        <div className="hidden w-full max-w-md grid-cols-3 gap-3 md:grid">
          <Card className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Enrolled</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{enrolled}</p>
          </Card>
          <Card className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Available</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{available}</p>
          </Card>
          <Card className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cohort Total</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{cohortTotal}</p>
          </Card>
        </div>
      )}
    </>
  );
}

interface CohortSubjectLearnersHeaderProps {
  cohortHref: string;
  cohortStudentsHref: string;
  createLearnerHref: string;
  cohortLabel: string;
  cohortSubjectId: number;
  mobileTitle: string;
  pageTitle: string;
  pageSubtitle: string;
  enrolledCount: number;
  availableCount: number;
  cohortTotalCount: number;
  addLearnerActionLabel: string;
  instructorView: boolean;
  canManageLearners: boolean;
  canViewCohortStudents: boolean;
  downloadingClassList: boolean;
  onBack: () => void;
  onDownloadClassList: () => void;
}

export function CohortSubjectLearnersHeader({
  cohortHref,
  cohortStudentsHref,
  createLearnerHref,
  cohortLabel,
  cohortSubjectId,
  mobileTitle,
  pageTitle,
  pageSubtitle,
  enrolledCount,
  availableCount,
  cohortTotalCount,
  addLearnerActionLabel,
  instructorView,
  canManageLearners,
  canViewCohortStudents,
  downloadingClassList,
  onBack,
  onDownloadClassList,
}: CohortSubjectLearnersHeaderProps) {
  const secondaryActions: ActionMenuItem[] = [
    ...(canViewCohortStudents ? [{
      label: 'View Cohort Students',
      href: cohortStudentsHref,
      icon: <Users className="h-4 w-4" />,
    }] : []),
    {
      label: downloadingClassList ? 'Downloading class list' : 'Download Class List',
      onSelect: onDownloadClassList,
      disabled: downloadingClassList,
      icon: <Download className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="hidden flex-wrap gap-2 md:flex">
        <Link href={cohortHref}>
          <Button type="button" variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Cohort
          </Button>
        </Link>
        {canViewCohortStudents ? (
          <Link href={cohortStudentsHref}>
            <Button variant="secondary" size="sm">
              View Cohort Students
            </Button>
          </Link>
        ) : null}
        {canManageLearners ? (
          <Link href={createLearnerHref}>
            <Button variant="primary" size="sm">
              <UserPlus className="h-4 w-4" />
              {addLearnerActionLabel}
            </Button>
          </Link>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onDownloadClassList}
          disabled={downloadingClassList}
        >
          <Download className="h-4 w-4" />
          {downloadingClassList ? 'Downloading...' : 'Download Class List'}
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        <div className="flex items-start gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Back to cohort"
            onClick={onBack}
            className="shrink-0 px-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{cohortLabel}</Badge>
            </div>
            <h1 className="text-xl font-bold leading-tight text-gray-900">{mobileTitle}</h1>
            <CohortSubjectLearnersStats
              enrolled={enrolledCount}
              available={availableCount}
              cohortTotal={cohortTotalCount}
              instructorView={instructorView}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManageLearners ? (
            <Link href={createLearnerHref} className="min-w-0 flex-1">
              <Button variant="primary" size="sm" className="w-full">
                <UserPlus className="h-4 w-4" />
                {addLearnerActionLabel}
              </Button>
            </Link>
          ) : null}
          <ActionMenu
            items={secondaryActions}
            buttonLabel="More"
            ariaLabel="Open cohort subject learner actions"
            align="right"
            hideLabelOnMobile
          />
        </div>
      </div>

      <div className="hidden flex-col gap-3 lg:flex-row lg:items-start lg:justify-between md:flex">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{cohortLabel}</Badge>
            <Badge variant="default">Cohort Subject #{cohortSubjectId}</Badge>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="mt-1 text-sm text-gray-500">{pageSubtitle}</p>
          </div>
        </div>

        <CohortSubjectLearnersStats
          enrolled={enrolledCount}
          available={availableCount}
          cohortTotal={cohortTotalCount}
          instructorView={instructorView}
        />
      </div>
    </div>
  );
}

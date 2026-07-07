'use client';

import Link from 'next/link';
import type { KeyboardEvent } from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/Table';
import type { StudentSummary } from '@/app/core/types/student';

export function getStudentName(student: StudentSummary) {
  if (student.full_name?.trim()) return student.full_name.trim();

  const parts = [
    student.first_name,
    student.middle_name,
    student.last_name,
  ].filter((value): value is string => Boolean(value?.trim()));

  return parts.length > 0 ? parts.join(' ') : `Learner #${student.id}`;
}

function getStudentContact(student: StudentSummary) {
  const contact = [student.email, student.phone]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' - ');

  return contact || '-';
}

function getLearnerStatus(student: StudentSummary) {
  return student.status_display?.trim() || student.status?.trim() || '-';
}

function getLearnerStatusVariant(student: StudentSummary): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (student.status) {
    case 'ACTIVE':
      return 'success';
    case 'TRANSFERRED':
      return 'warning';
    case 'GRADUATED':
      return 'info';
    case 'SUSPENDED':
    case 'WITHDRAWN':
      return 'danger';
    default:
      return 'default';
  }
}

interface LearnerTableProps {
  title: string;
  description: string;
  icon: LucideIcon;
  learners: StudentSummary[];
  selectedIds: Set<number>;
  buildLearnerHref: (learnerId: number) => string;
  onToggle: (studentId: number) => void;
  onToggleAll: () => void;
  actionLabel: string;
  actionVariant: 'primary' | 'danger';
  onAction: () => void;
  actionDisabled: boolean;
  emptyMessage: string;
}

export function LearnerTable({
  title,
  description,
  icon: Icon,
  learners,
  selectedIds,
  buildLearnerHref,
  onToggle,
  onToggleAll,
  actionLabel,
  actionVariant,
  onAction,
  actionDisabled,
  emptyMessage,
}: LearnerTableProps) {
  const allSelected = learners.length > 0 && learners.every((learner) => selectedIds.has(learner.id));

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <Badge variant="info">{learners.length}</Badge>
            </div>
            <p className="text-sm text-gray-500">{description}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
            <Button
              size="sm"
              variant={actionVariant === 'danger' ? 'danger' : 'primary'}
              disabled={actionDisabled}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          </div>
        </div>

        {learners.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    aria-label={`Select all ${title.toLowerCase()}`}
                  />
                </TableHead>
                <TableHead>Learner</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Contact</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {learners.map((learner) => (
                <TableRow key={learner.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(learner.id)}
                      onChange={() => onToggle(learner.id)}
                      aria-label={`Select ${getStudentName(learner)}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <Link
                        href={buildLearnerHref(learner.id)}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {getStudentName(learner)}
                      </Link>
                      {learner.primary_cohort_name ? (
                        <p className="text-xs text-gray-500">{learner.primary_cohort_name}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-gray-700">{learner.admission_number}</span>
                  </TableCell>
                  <TableCell>{getStudentContact(learner)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}

interface MobileLearnerCardProps {
  learner: StudentSummary;
  href: string;
  selected?: boolean;
  readOnly?: boolean;
  onToggle?: () => void;
}

export function MobileLearnerCard({
  learner,
  href,
  selected = false,
  readOnly = false,
  onToggle,
}: MobileLearnerCardProps) {
  const cardClassName = [
    'rounded-lg border bg-white p-4 text-left shadow-sm transition-colors',
    selected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-200 active:border-blue-300',
    readOnly ? '' : 'cursor-pointer',
  ].join(' ');

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (readOnly || !onToggle) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <article
      className={cardClassName}
      role={readOnly ? undefined : 'button'}
      tabIndex={readOnly ? undefined : 0}
      aria-pressed={readOnly ? undefined : selected}
      onClick={readOnly ? undefined : onToggle}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start gap-3">
        {!readOnly ? (
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
              selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-transparent'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={href}
                className="font-semibold text-blue-600 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {getStudentName(learner)}
              </Link>
              {learner.primary_cohort_name ? (
                <p className="mt-1 text-xs text-gray-500">{learner.primary_cohort_name}</p>
              ) : null}
            </div>
            {readOnly ? (
              <Badge variant={getLearnerStatusVariant(learner)} size="sm">
                {getLearnerStatus(learner)}
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="font-mono text-gray-700">{learner.admission_number}</span>
            {!readOnly ? (
              <Link
                href={href}
                className="font-medium text-blue-600 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                View
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

interface MobileLearnerSelectionListProps {
  title: string;
  description: string;
  icon: LucideIcon;
  learners: StudentSummary[];
  selectedIds: Set<number>;
  buildLearnerHref: (learnerId: number) => string;
  onToggle: (studentId: number) => void;
  emptyMessage: string;
}

export function MobileLearnerSelectionList({
  title,
  description,
  icon: Icon,
  learners,
  selectedIds,
  buildLearnerHref,
  onToggle,
  emptyMessage,
}: MobileLearnerSelectionListProps) {
  return (
    <Card className="md:hidden">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <Badge variant="info" size="sm">{learners.length}</Badge>
          </div>
          <p className="text-xs text-gray-500">{description}</p>
        </div>

        {learners.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-2">
            {learners.map((learner) => (
              <MobileLearnerCard
                key={learner.id}
                learner={learner}
                href={buildLearnerHref(learner.id)}
                selected={selectedIds.has(learner.id)}
                onToggle={() => onToggle(learner.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export function MobileReadOnlyLearnerList({
  learners,
  buildLearnerHref,
}: {
  learners: StudentSummary[];
  buildLearnerHref: (learnerId: number) => string;
}) {
  if (learners.length === 0) {
    return (
      <Card className="md:hidden">
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          No learners are enrolled in this cohort subject yet.
        </div>
      </Card>
    );
  }

  return (
    <Card className="md:hidden">
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-gray-900">Enrolled Learners</h2>
          <p className="text-xs text-gray-500">Read-only learner list for this assigned cohort subject.</p>
        </div>

        <div className="space-y-2">
          {learners.map((learner) => (
            <MobileLearnerCard
              key={learner.id}
              learner={learner}
              href={buildLearnerHref(learner.id)}
              readOnly
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ReadOnlyLearnerTable({
  learners,
  buildLearnerHref,
}: {
  learners: StudentSummary[];
  buildLearnerHref: (learnerId: number) => string;
}) {
  if (learners.length === 0) {
    return (
      <Card>
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          No learners are enrolled in this cohort subject yet.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Enrolled Learners</h2>
          <p className="text-sm text-gray-500">
            Read-only learner list for this assigned cohort subject.
          </p>
        </div>

        <Table>
          <TableHeader>
            <tr>
              <TableHead>Admission No.</TableHead>
              <TableHead>Learner Name</TableHead>
              <TableHead>Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {learners.map((learner) => (
              <TableRow key={learner.id}>
                <TableCell>
                  <span className="font-mono text-sm text-gray-700">{learner.admission_number}</span>
                </TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <Link
                      href={buildLearnerHref(learner.id)}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {getStudentName(learner)}
                    </Link>
                    {learner.primary_cohort_name ? (
                      <p className="text-xs text-gray-500">{learner.primary_cohort_name}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getLearnerStatusVariant(learner)}>
                    {getLearnerStatus(learner)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function MobileSelectionActionBar({
  selectedCount,
  actionLabel,
  actionVariant,
  onAction,
  disabled,
}: {
  selectedCount: number;
  actionLabel: string;
  actionVariant: 'primary' | 'danger';
  onAction: () => void;
  disabled: boolean;
}) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-900">{selectedCount} selected</span>
        <Button
          type="button"
          size="sm"
          variant={actionVariant === 'danger' ? 'danger' : 'primary'}
          disabled={disabled}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

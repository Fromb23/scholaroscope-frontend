'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AssignmentGroupReviewForm } from './AssignmentGroupReviewForm';
import { AssignmentWorkUnitNavigation } from './AssignmentWorkUnitNavigation';
import { formatDateTime } from './assignmentUtils';
import { useAssignmentGroupWorkReview } from '@/app/core/hooks/useAssignments';
import type { RubricLevel } from '@/app/core/types/assessment';
import type { Assignment, AssignmentGroup } from '@/app/core/types/assignments';

interface Props {
  assignment: Assignment;
  groups: AssignmentGroup[];
  groupsLoading: boolean;
  rubricLevels?: RubricLevel[];
  activeGroupId?: number | null;
  currentIndex?: number;
  totalCount?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onSaved?: () => void | Promise<void>;
  onSaveAndNext?: () => void | Promise<void>;
  pending?: boolean;
  readOnly?: boolean;
  focusToken?: string | null;
}

export function AssignmentGroupEvaluationsPanel({
  assignment, groups, groupsLoading, rubricLevels = [], activeGroupId = null,
  currentIndex = 0, totalCount, onPrevious = () => undefined, onNext = () => undefined,
  onSaved, onSaveAndNext, pending = false, readOnly = false, focusToken = null,
}: Props) {
  const activeGroup = useMemo(() => groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null, [activeGroupId, groups]);
  const reviewQuery = useAssignmentGroupWorkReview(activeGroup?.id ?? null, { enabled: Boolean(activeGroup?.id) });
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (!focusToken || reviewQuery.loading || !reviewQuery.review) return;
    headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
  }, [activeGroup?.id, focusToken, reviewQuery.loading, reviewQuery.review]);

  if (groupsLoading) return <Card><LoadingSpinner fullScreen={false} message="Loading groups..." /></Card>;
  if (!activeGroup) return <Card><p className="py-10 text-center text-sm theme-muted">Create groups before reviewing group work.</p></Card>;

  const result = reviewQuery.review;
  const group = result?.group ?? activeGroup;
  const learnerWork = result?.submitted_group_work ?? null;
  return (
    <Card className="space-y-4">
      <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-28 text-xl font-semibold theme-text">Review group work</h2>
      <AssignmentWorkUnitNavigation label="Group" currentIndex={currentIndex} totalCount={totalCount ?? groups.length} onPrevious={onPrevious} onNext={onNext} disabled={pending} queueDescription={group.name} />
      {reviewQuery.error ? <ErrorBanner message={reviewQuery.error} onDismiss={() => void reviewQuery.refetch()} /> : null}
      {reviewQuery.loading ? <LoadingSpinner fullScreen={false} message={`Loading ${group.name}...`} /> : null}
      <div className="rounded-lg border theme-border p-4">
        <div className="flex flex-wrap items-center gap-2"><strong>{group.name}</strong><span className="text-sm theme-muted">{group.members?.length ?? 0} members</span>{result?.evaluation?.review_status === 'COMPLETED' ? <Badge variant="green">Review complete</Badge> : result?.evaluation ? <Badge variant="yellow">Draft</Badge> : <Badge variant="default">Not reviewed</Badge>}</div>
      </div>
      {learnerWork ? <section className="space-y-2 rounded-lg border theme-border theme-surface-muted p-4">
        <h3 className="font-medium theme-text">Submitted group work</h3>
        <p className="text-xs theme-muted">Submitted by learners · {formatDateTime(learnerWork.submitted_at)}</p>
        {learnerWork.text_response ? <p className="whitespace-pre-wrap text-sm theme-text">{learnerWork.text_response}</p> : null}
        <p className="text-xs theme-muted">Attachments: {learnerWork.attachment_metadata.length}</p>
      </section> : null}
      {result ? <AssignmentGroupReviewForm assignment={assignment} group={group} evaluation={result.evaluation} rubricLevels={rubricLevels} onSaved={onSaved} onSaveAndNext={onSaveAndNext} pending={pending} readOnly={readOnly} /> : null}
    </Card>
  );
}

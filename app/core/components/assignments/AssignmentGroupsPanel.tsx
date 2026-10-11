'use client';

import { GroupRosterSummary } from '@/app/core/components/grouping/GroupRosterSummary';
import type { Assignment, AssignmentGroup } from '@/app/core/types/assignments';

interface AssignmentGroupsPanelProps {
  assignment: Assignment;
  groups: AssignmentGroup[];
  loading: boolean;
  error?: string | null;
  refetch?: () => void;
}

/**
 * Compatibility entry point for the assignment detail tabs. Group membership is
 * now edited only in the shared, routed builder used by Projects and Assignments.
 */
export function AssignmentGroupsPanel({ assignment }: AssignmentGroupsPanelProps) {
  return <GroupRosterSummary type="assignment" id={assignment.id} />;
}

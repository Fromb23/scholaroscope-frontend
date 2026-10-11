import type { GroupingDraftGroup, GroupingLearner } from '@/app/core/types/grouping';

export function moveDraftLearner(
  groups: GroupingDraftGroup[],
  studentId: number,
  targetClientId: string | null,
): GroupingDraftGroup[] {
  return groups.map((group) => ({
    ...group,
    studentIds:
      group.clientId === targetClientId
        ? Array.from(new Set([...group.studentIds, studentId]))
        : group.studentIds.filter((idValue) => idValue !== studentId),
  }));
}

export function draftGroupsFromRandomPreview(
  groups: Array<{
    client_id: string;
    name: string;
    notes: string;
    members: GroupingLearner[];
  }>,
): GroupingDraftGroup[] {
  return groups.map((group) => ({
    clientId: group.client_id,
    name: group.name,
    notes: group.notes,
    studentIds: group.members.map((member) => member.id),
  }));
}

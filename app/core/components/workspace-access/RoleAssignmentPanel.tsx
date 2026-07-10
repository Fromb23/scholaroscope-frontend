import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import type {
  WorkspaceRole,
  WorkspaceRoleAssignment,
  WorkspaceRoleAssignmentPayload,
} from '@/app/core/types/workspaceAccess';

interface RoleAssignmentPanelProps {
  roles: WorkspaceRole[];
  assignments: WorkspaceRoleAssignment[];
  onAssign: (payload: WorkspaceRoleAssignmentPayload) => Promise<void>;
  onEnd: (assignmentId: number, reason: string) => Promise<void>;
  assigning?: boolean;
  ending?: boolean;
}

export function RoleAssignmentPanel({
  roles,
  assignments,
  onAssign,
  onEnd,
  assigning = false,
  ending = false,
}: RoleAssignmentPanelProps) {
  const assignableRoles = useMemo(
    () => roles.filter((role) => role.actions.can_assign && role.is_active),
    [roles]
  );
  const [membershipId, setMembershipId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [reason, setReason] = useState('');
  const [endReasonById, setEndReasonById] = useState<Record<number, string>>({});

  const submitAssignment = async () => {
    const parsedMembershipId = Number(membershipId);
    const parsedRoleId = Number(roleId);
    if (!Number.isInteger(parsedMembershipId) || !Number.isInteger(parsedRoleId)) return;
    await onAssign({
      membership_id: parsedMembershipId,
      role_id: parsedRoleId,
      assigned_reason: reason,
      scopes: [{ scope_type: 'WORKSPACE', scope_object_id: null }],
    });
    setMembershipId('');
    setRoleId('');
    setReason('');
  };

  return (
    <div className="rounded-md border theme-border">
      <div className="border-b theme-border p-4">
        <h2 className="font-semibold theme-text">Assignments</h2>
        <p className="theme-muted mt-1 text-sm">
          Active assignments use backend-validated roles and scopes.
        </p>
      </div>

      <div className="grid gap-3 border-b theme-border p-4 md:grid-cols-[140px_1fr_1fr_auto]">
        <Input
          value={membershipId}
          onChange={(event) => setMembershipId(event.target.value)}
          placeholder="Membership ID"
          inputMode="numeric"
        />
        <select
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
          className="rounded-md border theme-border bg-transparent px-3 py-2 text-sm theme-text"
        >
          <option value="">Select role</option>
          {assignableRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason"
        />
        <Button
          type="button"
          size="sm"
          onClick={submitAssignment}
          disabled={assigning || !membershipId || !roleId}
        >
          <Plus className="mr-2 h-4 w-4" />
          Assign
        </Button>
      </div>

      <div className="divide-y theme-border">
        {assignments.length === 0 ? (
          <p className="theme-muted p-4 text-sm">No active role assignments returned.</p>
        ) : assignments.map((assignment) => (
          <div key={assignment.id} className="grid gap-3 p-4 md:grid-cols-[1fr_180px_auto]">
            <div>
              <p className="font-medium theme-text">
                {assignment.membership.name || assignment.membership.email}
              </p>
              <p className="theme-muted text-sm">
                {assignment.role.name} · {assignment.membership.classification} · {assignment.status}
              </p>
              <p className="theme-subtle mt-1 text-xs">
                {assignment.scopes.map((scope) => (
                  `${scope.scope_type}${scope.scope_object_id ? `:${scope.scope_object_id}` : ''}`
                )).join(', ')}
              </p>
            </div>
            <Input
              value={endReasonById[assignment.id] ?? ''}
              onChange={(event) => setEndReasonById((current) => ({
                ...current,
                [assignment.id]: event.target.value,
              }))}
              placeholder="End reason"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onEnd(assignment.id, endReasonById[assignment.id] ?? '')}
              disabled={ending || assignment.status !== 'ACTIVE'}
            >
              <X className="mr-2 h-4 w-4" />
              End
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

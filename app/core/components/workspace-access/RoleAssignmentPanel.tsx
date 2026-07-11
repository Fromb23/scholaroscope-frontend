import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, X } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import type {
  WorkspaceAssignmentScopeType,
  WorkspaceRole,
  WorkspaceRoleAssignment,
  WorkspaceRoleAssignmentPayload,
  WorkspaceScopeOption,
  WorkspaceStaffOption,
} from '@/app/core/types/workspaceAccess';

const SCOPE_TYPES: Array<{
  value: WorkspaceAssignmentScopeType;
  label: string;
}> = [
  { value: 'COHORT', label: 'Cohort' },
  { value: 'SUBJECT', label: 'Subject' },
  { value: 'COHORT_SUBJECT', label: 'Class subject' },
  { value: 'WORKSPACE', label: 'Workspace' },
];

const EMPTY_SCOPE_TYPES: WorkspaceAssignmentScopeType[] = [];

interface RoleAssignmentPanelProps {
  roles: WorkspaceRole[];
  assignments: WorkspaceRoleAssignment[];
  onAssign: (payload: WorkspaceRoleAssignmentPayload) => Promise<void>;
  onEnd: (assignmentId: number, reason: string) => Promise<void>;
  staffOptions?: WorkspaceStaffOption[];
  scopeOptions?: WorkspaceScopeOption[];
  optionsLoading?: boolean;
  assigning?: boolean;
  ending?: boolean;
}

function scopeLabel(scope: WorkspaceRoleAssignment['scopes'][number]): string {
  return `${scope.scope_type}${scope.scope_object_id ? `:${scope.scope_object_id}` : ''}`;
}

export function RoleAssignmentPanel({
  roles,
  assignments,
  onAssign,
  onEnd,
  staffOptions = [],
  scopeOptions = [],
  optionsLoading = false,
  assigning = false,
  ending = false,
}: RoleAssignmentPanelProps) {
  const assignableRoles = useMemo(
    () => roles.filter((role) => role.actions.can_assign && role.is_active),
    [roles],
  );
  const staff = useMemo(
    () => [...staffOptions].sort((left, right) => left.label.localeCompare(right.label)),
    [staffOptions],
  );

  const [staffMembershipId, setStaffMembershipId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [scopeType, setScopeType] = useState<WorkspaceAssignmentScopeType | ''>('');
  const [scopeObjectId, setScopeObjectId] = useState('');
  const [reason, setReason] = useState('');
  const [workspaceScopeConfirmed, setWorkspaceScopeConfirmed] = useState(false);
  const [endReasonById, setEndReasonById] = useState<Record<number, string>>({});

  const selectedRole = useMemo(
    () => assignableRoles.find((role) => String(role.id) === roleId) ?? null,
    [assignableRoles, roleId],
  );
  const selectedRoleScopePolicy = selectedRole?.assignment_scope_policy;
  const allowedScopeTypes = selectedRoleScopePolicy?.allowed_scope_types ?? EMPTY_SCOPE_TYPES;
  const availableScopeTypes = useMemo(
    () => SCOPE_TYPES.filter((scope) => allowedScopeTypes.includes(scope.value)),
    [allowedScopeTypes],
  );
  const selectedScopeRequiresObject = scopeType !== '' && scopeType !== 'WORKSPACE';
  const selectedScopeTypeAllowed = Boolean(
    scopeType && allowedScopeTypes.includes(scopeType),
  );
  const workspaceScopeRequiresConfirmation = Boolean(
    scopeType === 'WORKSPACE'
    && selectedRoleScopePolicy?.workspace_scope_requires_confirmation,
  );
  const availableScopeOptions = useMemo(
    () => scopeOptions.filter((option) => option.scope_type === scopeType),
    [scopeOptions, scopeType],
  );
  const canSubmit = Boolean(
    staffMembershipId
    && roleId
    && reason.trim()
    && selectedScopeTypeAllowed
    && (!selectedScopeRequiresObject || scopeObjectId)
    && !optionsLoading
    && (!workspaceScopeRequiresConfirmation || workspaceScopeConfirmed),
  );

  const submitAssignment = async () => {
    const parsedMembershipId = Number(staffMembershipId);
    const parsedRoleId = Number(roleId);
    const parsedScopeObjectId = scopeType === 'WORKSPACE' ? null : Number(scopeObjectId);
    const hasValidScopeObject = scopeType === 'WORKSPACE' || (
      scopeObjectId !== ''
      && typeof parsedScopeObjectId === 'number'
      && Number.isInteger(parsedScopeObjectId)
      && parsedScopeObjectId > 0
    );
    if (
      !Number.isInteger(parsedMembershipId)
      || parsedMembershipId <= 0
      || !Number.isInteger(parsedRoleId)
      || parsedRoleId <= 0
      || !scopeType
      || !allowedScopeTypes.includes(scopeType)
      || !hasValidScopeObject
    ) {
      return;
    }

    try {
      await onAssign({
        membership_id: parsedMembershipId,
        role_id: parsedRoleId,
        assigned_reason: reason.trim(),
        broad_scope_confirmed: workspaceScopeRequiresConfirmation ? workspaceScopeConfirmed : false,
        scopes: [
          {
            scope_type: scopeType,
            scope_object_id: parsedScopeObjectId,
          },
        ],
      });
    } catch {
      return;
    }
    setStaffMembershipId('');
    setRoleId('');
    setScopeType('');
    setScopeObjectId('');
    setReason('');
    setWorkspaceScopeConfirmed(false);
  };

  return (
    <div className="rounded-md border theme-border">
      <div className="border-b theme-border p-4">
        <h2 className="font-semibold theme-text">Staff role assignments</h2>
        <p className="theme-muted mt-1 text-sm">
          Role assignment grants permissions only. Teaching still follows teaching assignments.
        </p>
      </div>

      <div className="grid gap-3 border-b theme-border p-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
        <label className="text-sm">
          <span className="mb-1 block font-medium theme-text">Staff member</span>
          <select
            value={staffMembershipId}
            onChange={(event) => setStaffMembershipId(event.target.value)}
            className="theme-input w-full rounded-lg px-4 py-2"
            disabled={optionsLoading || staff.length === 0}
          >
            <option value="">
              {optionsLoading
                ? 'Loading assignment options...'
                : staff.length === 0
                  ? 'No assignable staff returned'
                  : 'Select staff member'}
            </option>
            {staff.map((option) => (
              <option key={option.membership_id} value={option.membership_id}>
                {option.label} · {option.email}
              </option>
            ))}
          </select>
          {!optionsLoading && staff.length === 0 ? (
            <span className="theme-subtle mt-1 block text-xs">
              Assignment options must return staff before a new role can be assigned.
            </span>
          ) : null}
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium theme-text">Role</span>
          <select
            value={roleId}
            onChange={(event) => {
              setRoleId(event.target.value);
              setScopeType('');
              setScopeObjectId('');
              setWorkspaceScopeConfirmed(false);
            }}
            className="theme-input w-full rounded-lg px-4 py-2"
          >
            <option value="">Select role</option>
            {assignableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium theme-text">Scope type</span>
          <select
            value={scopeType}
            onChange={(event) => {
              setScopeType(event.target.value as WorkspaceAssignmentScopeType | '');
              setScopeObjectId('');
              setWorkspaceScopeConfirmed(false);
            }}
            className="theme-input w-full rounded-lg px-4 py-2"
            disabled={!selectedRole || availableScopeTypes.length === 0}
          >
            <option value="">
              {!selectedRole ? 'Select role first' : 'Select scope'}
            </option>
            {availableScopeTypes.map((scope) => (
              <option key={scope.value} value={scope.value}>
                {scope.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium theme-text">Scope object</span>
          <select
            value={scopeObjectId}
            onChange={(event) => setScopeObjectId(event.target.value)}
            className="theme-input w-full rounded-lg px-4 py-2"
            disabled={!selectedScopeRequiresObject || availableScopeOptions.length === 0}
          >
            <option value="">
              {!scopeType
                ? 'Select scope type first'
                : scopeType === 'WORKSPACE'
                  ? 'Workspace has no object'
                  : availableScopeOptions.length === 0
                    ? 'No objects returned for this scope'
                    : 'Select object'}
            </option>
            {availableScopeOptions.map((option) => (
              <option key={`${option.scope_type}:${option.id}`} value={option.id}>
                {option.description ? `${option.label} - ${option.description}` : option.label}
              </option>
            ))}
          </select>
          {selectedScopeRequiresObject && availableScopeOptions.length === 0 ? (
            <span className="theme-subtle mt-1 block text-xs">
              Assignment options did not return objects for this scope type.
            </span>
          ) : null}
        </label>

        <Button
          type="button"
          size="sm"
          onClick={() => void submitAssignment()}
          disabled={assigning || !canSubmit}
          className="self-end"
        >
          <Plus className="mr-2 h-4 w-4" />
          Assign
        </Button>
      </div>

      <div className="space-y-3 border-b theme-border p-4">
        <Input
          label="Reason"
          id="workspace-role-assignment-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why this staff member needs this role and scope"
          required
        />
        {selectedRoleScopePolicy ? (
          <div className="space-y-1">
            <p className="theme-subtle text-xs">
              Preferred scope: {selectedRoleScopePolicy.preferred_scope_types.join(', ')}
            </p>
            {selectedRoleScopePolicy.reason ? (
              <p className="theme-subtle text-xs">{selectedRoleScopePolicy.reason}</p>
            ) : null}
          </div>
        ) : null}
        {workspaceScopeRequiresConfirmation ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-2">
                <p className="font-semibold">Workspace scope applies this role across the entire workspace.</p>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={workspaceScopeConfirmed}
                    onChange={(event) => setWorkspaceScopeConfirmed(event.target.checked)}
                  />
                  <span>I confirm this staff member needs workspace-wide role authority.</span>
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="divide-y theme-border">
        {assignments.length === 0 ? (
          <p className="theme-muted p-4 text-sm">No active staff role assignments returned.</p>
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
                {assignment.scopes.map(scopeLabel).join(', ')}
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

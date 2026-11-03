import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import Modal from '@/app/components/ui/Modal';
import type {
  WorkspaceAssignmentScopeType,
  WorkspaceRole,
  WorkspaceRoleAssignmentPayload,
  WorkspaceScopeOption,
  WorkspaceStaffAssignment,
} from '@/app/core/types/workspaceAccess';

interface Props {
  roles: WorkspaceRole[];
  staff: WorkspaceStaffAssignment[];
  scopeOptions: WorkspaceScopeOption[];
  onAssign: (payload: WorkspaceRoleAssignmentPayload) => Promise<void>;
  onEnd: (assignmentId: number) => Promise<void>;
  assigning?: boolean;
  ending?: boolean;
  selectedMembershipId?: number | null;
  onSelectedMembershipChange?: (membershipId: number | null) => void;
}

const scopeLabels: Record<WorkspaceAssignmentScopeType, string> = {
  WORKSPACE: 'Workspace', COHORT: 'Cohort', SUBJECT: 'Subject', COHORT_SUBJECT: 'Class subject',
};

export function RoleAssignmentPanel({ roles, staff, scopeOptions, onAssign, onEnd, assigning, ending, selectedMembershipId, onSelectedMembershipChange }: Props) {
  const [selected, setSelected] = useState<WorkspaceStaffAssignment | null>(null);
  const [roleId, setRoleId] = useState('');
  const [scopeType, setScopeType] = useState<WorkspaceAssignmentScopeType | ''>('');
  const [scopeObjectId, setScopeObjectId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const assignable = roles.filter((role) => role.actions.can_assign && role.is_active);
  const role = assignable.find((item) => String(item.id) === roleId) ?? null;
  const allowedScopes = role?.assignment_scope_policy?.allowed_scope_types ?? [];
  const defaultWorkspace = allowedScopes.length === 1 && allowedScopes[0] === 'WORKSPACE';
  const effectiveScope = defaultWorkspace ? 'WORKSPACE' : scopeType;
  const matchingScopes = useMemo(
    () => scopeOptions.filter((option) => option.scope_type === effectiveScope),
    [effectiveScope, scopeOptions],
  );
  const requiresConfirmation = effectiveScope === 'WORKSPACE'
    && Boolean(role?.assignment_scope_policy?.workspace_scope_requires_confirmation);
  const canSave = Boolean(selected && role && effectiveScope
    && (effectiveScope === 'WORKSPACE' || scopeObjectId)
    && (!requiresConfirmation || confirmed));

  useEffect(() => {
    if (selectedMembershipId == null) setSelected(null);
    else setSelected(staff.find((person) => person.membership_id === selectedMembershipId) ?? null);
  }, [selectedMembershipId, staff]);
  const reset = () => { setRoleId(''); setScopeType(''); setScopeObjectId(''); setConfirmed(false); };
  const close = () => { setSelected(null); onSelectedMembershipChange?.(null); reset(); };
  const submit = async () => {
    if (!selected || !role || !effectiveScope || !canSave) return;
    try {
      await onAssign({
        membership_id: selected.membership_id,
        role_id: role.id,
        broad_scope_confirmed: requiresConfirmation ? confirmed : false,
        scopes: [{
          scope_type: effectiveScope,
          scope_object_id: effectiveScope === 'WORKSPACE' ? null : Number(scopeObjectId),
        }],
      });
    } catch {
      return;
    }
    close();
  };

  if (staff.length === 0) {
    return <div className="rounded-md border theme-border p-8 text-center theme-muted">No staff members are available in this workspace.</div>;
  }

  return <>
    <div className="overflow-hidden rounded-md border theme-border">
      <div className="hidden grid-cols-[1.4fr_1.5fr_1fr_auto] gap-4 border-b theme-border bg-black/5 px-4 py-3 text-xs font-semibold uppercase theme-subtle md:grid">
        <span>Staff member</span><span>Workspace roles</span><span>Scope</span><span>Action</span>
      </div>
      <div className="divide-y theme-border">
        {staff.map((person) => <div key={person.membership_id} className="grid gap-3 p-4 md:grid-cols-[1.4fr_1.5fr_1fr_auto] md:items-center">
          <div><p className="font-medium theme-text">{person.name || person.email}</p><p className="text-sm theme-muted">{person.membership_status === 'ACTIVE' ? 'Active staff' : person.membership_status}</p></div>
          <div className="flex flex-wrap gap-2">{person.roles.length ? person.roles.map((item) => <span key={item.assignment_id} className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-700">{item.name}</span>) : <span className="text-sm theme-subtle">No workspace roles</span>}</div>
          <p className="text-sm theme-muted">{person.scope_summary.map((scope) => scopeLabels[scope.split(':')[0] as WorkspaceAssignmentScopeType] ?? scope).join(', ') || 'No role scope'}</p>
          <Button size="sm" variant="secondary" onClick={() => { setSelected(person); onSelectedMembershipChange?.(person.membership_id); }} disabled={!person.can_manage_roles}>Manage roles</Button>
        </div>)}
      </div>
    </div>

    <Modal isOpen={Boolean(selected)} onClose={close} title={`Manage roles · ${selected?.name || selected?.email || ''}`} description="Add or remove permission-bearing workspace roles. Membership classification and teaching assignments are managed separately." size="lg" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={close}>Close</Button><Button onClick={() => void submit()} disabled={!canSave || assigning}>{assigning ? 'Saving roles…' : 'Save changes'}</Button></div>}>
      <div className="space-y-5">
        <section><h3 className="mb-2 text-sm font-semibold theme-text">Current roles</h3><div className="space-y-2">{selected?.roles.length ? selected.roles.map((item) => <div key={item.assignment_id} className="flex items-center justify-between rounded-md border theme-border p-3"><div><p className="font-medium theme-text">{item.name}</p><p className="text-xs theme-muted">{item.responsibility_type} · {item.scopes.map((scope) => scopeLabels[scope.scope_type as WorkspaceAssignmentScopeType] ?? scope.scope_type).join(', ')}</p></div>{item.can_remove ? <Button size="sm" variant="secondary" disabled={ending} onClick={() => { if (window.confirm(`Remove ${item.name} from ${selected.name || selected.email}?`)) void onEnd(item.assignment_id).then(close).catch(() => undefined); }}><X className="mr-1 h-4 w-4" />Remove</Button> : <span className="text-xs theme-subtle">{item.responsibility_type === 'OVERSIGHT' ? 'Managed through the Principal governance lifecycle' : 'Protected assignment'}</span>}</div>) : <p className="text-sm theme-muted">No workspace roles assigned.</p>}</div></section>
        <section className="space-y-3 border-t theme-border pt-4"><h3 className="text-sm font-semibold theme-text">Add role</h3><label className="block text-sm"><span className="mb-1 block theme-text">Role</span><select className="theme-input w-full rounded-lg px-3 py-2" value={roleId} onChange={(event) => { setRoleId(event.target.value); setScopeType(''); setScopeObjectId(''); setConfirmed(false); }}><option value="">Select an assignable role</option>{assignable.filter((item) => !selected?.roles.some((current) => current.role_id === item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {role && !defaultWorkspace ? <label className="block text-sm"><span className="mb-1 block theme-text">Scope</span><select className="theme-input w-full rounded-lg px-3 py-2" value={scopeType} onChange={(event) => { setScopeType(event.target.value as WorkspaceAssignmentScopeType); setScopeObjectId(''); }}><option value="">Select scope</option>{allowedScopes.map((scope) => <option key={scope} value={scope}>{scopeLabels[scope]}</option>)}</select></label> : null}
          {role && effectiveScope && effectiveScope !== 'WORKSPACE' ? <label className="block text-sm"><span className="mb-1 block theme-text">{scopeLabels[effectiveScope]}</span><select className="theme-input w-full rounded-lg px-3 py-2" value={scopeObjectId} onChange={(event) => setScopeObjectId(event.target.value)}><option value="">Select {scopeLabels[effectiveScope].toLowerCase()}</option>{matchingScopes.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> : null}
          {role && effectiveScope === 'WORKSPACE' ? <p className="rounded-md bg-blue-500/10 p-3 text-sm theme-text">This role applies across the workspace.</p> : null}
          {requiresConfirmation ? <label className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I confirm this staff member needs workspace-wide authority.</span></label> : null}
          {role?.assignment_scope_policy?.reason ? <p className="text-xs theme-subtle">{role.assignment_scope_policy.reason}</p> : null}
        </section>
      </div>
    </Modal>
  </>;
}

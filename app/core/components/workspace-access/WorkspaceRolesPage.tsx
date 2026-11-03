'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import Modal from '@/app/components/ui/Modal';
import { AppErrorBanner } from '@/app/components/ui/errors/AppErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { resolveWorkspaceError, type AppError } from '@/app/core/errors';
import { useWorkspaceAccess } from '@/app/core/hooks/useWorkspaceAccess';
import type { WorkspaceRole } from '@/app/core/types/workspaceAccess';
import { PermissionMatrix } from './PermissionMatrix';
import { RoleAssignmentPanel } from './RoleAssignmentPanel';

type Tab = 'roles' | 'staff';
type RoleModal = { mode: 'view' | 'create' | 'edit'; role?: WorkspaceRole } | null;

export function WorkspaceRolesPage() {
  const access = useWorkspaceAccess();
  const { rolesQuery, permissionsQuery, staffAssignmentsQuery, assignmentOptionsQuery, meQuery, actions } = access;
  const roles = rolesQuery.data?.results ?? [];
  const summary = rolesQuery.data?.summary;
  const [tab, setTab] = useState<Tab>('roles');
  const [modal, setModal] = useState<RoleModal>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<AppError | null>(null);

  useEffect(() => {
    const role = modal?.role;
    setName(role?.name ?? ''); setDescription(role?.description ?? ''); setPermissionKeys(role?.permission_keys ?? []);
  }, [modal]);

  const error = rolesQuery.error || permissionsQuery.error || meQuery.error || staffAssignmentsQuery.error;
  const loading = rolesQuery.isLoading || permissionsQuery.isLoading || meQuery.isLoading || staffAssignmentsQuery.isLoading;
  const selectedPermissions = useMemo(() => new Set(permissionKeys), [permissionKeys]);
  const mutate = async (work: () => Promise<unknown>, message: string) => {
    setMutationError(null);
    try { await work(); setFeedback(message); setModal(null); }
    catch (caught) { setMutationError(resolveWorkspaceError(caught, { action: 'update', entityLabel: 'workspace role', channel: 'inline' })); }
  };

  if (loading) return <LoadingSpinner fullScreen={false} message="Loading workspace roles and staff assignments…" />;
  if (error) return <div className="mx-auto max-w-4xl space-y-4"><AppErrorBanner error={resolveWorkspaceError(error, { action: 'load', entityLabel: 'workspace roles', channel: 'inline' })} /><Button onClick={() => { void rolesQuery.refetch(); void permissionsQuery.refetch(); void staffAssignmentsQuery.refetch(); }}>Retry</Button></div>;

  const saveRole = () => {
    if (!modal || !name.trim()) return;
    if (modal.mode === 'edit' && modal.role) return mutate(() => actions.updateRole.mutateAsync({ roleId: modal.role!.id, payload: { name: name.trim(), description: description.trim(), permission_keys: permissionKeys } }), 'Role updated.');
    return mutate(() => actions.createRole.mutateAsync({ name: name.trim(), description: description.trim(), permission_keys: permissionKeys }), 'Role created.');
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="text-2xl font-bold theme-text">Workspace roles</h1><p className="mt-1 max-w-3xl text-sm theme-muted">Define permission-bearing roles separately from the staff who hold them. Membership classification and teaching assignments remain separate.</p></div>{tab === 'roles' && meQuery.data?.permission_keys.includes('workspace.roles.manage') ? <Button onClick={() => setModal({ mode: 'create' })}><Plus className="mr-2 h-4 w-4" />Create role</Button> : null}</header>
    {feedback ? <div role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">{feedback}</div> : null}
    {mutationError ? <AppErrorBanner error={mutationError} onDismiss={() => setMutationError(null)} compact /> : null}
    <div role="tablist" aria-label="Workspace role management" className="flex gap-1 border-b theme-border"><button role="tab" aria-selected={tab === 'roles'} className={`px-4 py-3 text-sm font-medium ${tab === 'roles' ? 'border-b-2 border-blue-500 theme-text' : 'theme-muted'}`} onClick={() => setTab('roles')}>Roles</button><button role="tab" aria-selected={tab === 'staff'} className={`px-4 py-3 text-sm font-medium ${tab === 'staff' ? 'border-b-2 border-blue-500 theme-text' : 'theme-muted'}`} onClick={() => setTab('staff')}>Staff assignments</button></div>

    {tab === 'roles' ? <section role="tabpanel" className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Total roles', summary?.total_roles], ['System roles', summary?.system_roles], ['Custom roles', summary?.custom_roles], ['Active role assignments', summary?.active_role_assignments]].map(([label, value]) => <div key={String(label)} className="rounded-md border theme-border p-4"><p className="text-sm theme-muted">{label}</p><p className="mt-1 text-2xl font-bold theme-text">{value ?? 0}</p></div>)}</div>
      {roles.length === 0 ? <div className="rounded-md border theme-border p-8 text-center"><p className="font-medium theme-text">No roles found</p><p className="mt-1 text-sm theme-muted">Create a custom role to compose delegable workspace permissions.</p></div> : <div className="overflow-x-auto rounded-md border theme-border"><table className="w-full min-w-[960px] text-left text-sm"><thead className="border-b theme-border bg-black/5 text-xs uppercase theme-subtle"><tr>{['Role', 'Type', 'Responsibility', 'Permissions', 'Assigned staff', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y theme-border">{roles.map((role) => <tr key={role.id}><td className="px-4 py-4"><div className="flex items-center gap-2"><span className="font-semibold theme-text">{role.name}</span>{role.is_system_managed ? <ShieldCheck aria-label="Protected system role" className="h-4 w-4 text-blue-500" /> : null}</div><p className="mt-1 max-w-xs text-xs theme-muted">{role.description || 'No description'}</p>{role.responsibility_type === 'OVERSIGHT' ? <p className="mt-2 text-xs text-blue-700">Principal oversight is managed through the institution-governance lifecycle.</p> : null}</td><td className="px-4 py-4"><span className="rounded-full bg-black/5 px-2 py-1 text-xs">{role.is_system_managed ? 'System' : 'Custom'}</span></td><td className="px-4 py-4">{role.responsibility_type === 'NONE' ? 'Operational' : role.responsibility_type.toLowerCase()}</td><td className="px-4 py-4">{role.permission_count}</td><td className="px-4 py-4">{role.active_assignment_count}</td><td className="px-4 py-4">{role.is_active ? 'Active' : 'Archived'}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => setModal({ mode: 'view', role })}>View</Button>{role.actions.can_update ? <Button size="sm" variant="secondary" onClick={() => setModal({ mode: 'edit', role })}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button> : null}{role.actions.can_archive ? <Button size="sm" variant="secondary" onClick={() => { if (window.confirm(`Archive ${role.name}? Existing historical assignments will be preserved.`)) void mutate(() => actions.archiveRole.mutateAsync(role.id), 'Role archived.'); }}><Trash2 className="mr-1 h-3.5 w-3.5" />Archive</Button> : null}{role.actions.can_assign ? <Button size="sm" variant="secondary" onClick={() => setTab('staff')}><UserPlus className="mr-1 h-3.5 w-3.5" />Assign staff</Button> : null}</div>{role.is_system_managed && !role.actions.can_update ? <p className="mt-2 max-w-xs text-xs theme-subtle">{role.action_explanations.update}</p> : null}</td></tr>)}</tbody></table></div>}
    </section> : <section role="tabpanel" className="space-y-3"><div><h2 className="font-semibold theme-text">Staff role assignments</h2><p className="text-sm theme-muted">Each staff member appears once. Labels below are workspace roles, not membership classifications.</p></div><RoleAssignmentPanel roles={roles} staff={staffAssignmentsQuery.data ?? []} scopeOptions={assignmentOptionsQuery.data?.scope_options ?? []} assigning={actions.assignRole.isPending} ending={actions.endAssignment.isPending} onAssign={(payload) => mutate(() => actions.assignRole.mutateAsync(payload), 'Role assigned.').then(() => undefined)} onEnd={(assignmentId) => mutate(() => actions.endAssignment.mutateAsync({ assignmentId }), 'Role removed.').then(() => undefined)} /></section>}

    <Modal isOpen={Boolean(modal)} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Create role' : modal?.mode === 'edit' ? `Edit ${modal.role?.name}` : modal?.role?.name ?? 'Role details'} description={modal?.mode === 'view' ? 'Inspect this role’s exact permission bundle and current staff assignments.' : 'Custom roles compose existing delegable permissions; role names do not grant authority.'} size="xl" footer={modal?.mode !== 'view' ? <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button disabled={!name.trim() || actions.createRole.isPending || actions.updateRole.isPending} onClick={() => void saveRole()}>{actions.createRole.isPending || actions.updateRole.isPending ? 'Saving role…' : 'Save role'}</Button></div> : <Button variant="secondary" onClick={() => setModal(null)}>Close</Button>}>
      {modal?.mode === 'view' && modal.role ? <div className="space-y-5"><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs theme-subtle">Type</dt><dd className="theme-text">{modal.role.is_system_managed ? 'Protected system role' : 'Custom role'}</dd></div><div><dt className="text-xs theme-subtle">Responsibility</dt><dd className="theme-text">{modal.role.responsibility_type}</dd></div><div><dt className="text-xs theme-subtle">Scope behaviour</dt><dd className="theme-text">{modal.role.assignment_scope_policy?.allowed_scope_types.join(', ') || 'No assignable scope'}</dd></div><div><dt className="text-xs theme-subtle">Updated</dt><dd className="theme-text">{new Date(modal.role.updated_at).toLocaleString()}</dd></div></dl>{modal.role.responsibility_type === 'OVERSIGHT' ? <div className="rounded-md bg-blue-500/10 p-3 text-sm theme-text">Principal oversight is managed through the institution-governance lifecycle. Appointment, replacement, suspension, restoration and tenure ending are not available here.</div> : null}<PermissionMatrix permissions={(permissionsQuery.data ?? []).filter((permission) => selectedPermissions.has(permission.key))} selected={modal.role.permission_keys} onToggle={() => undefined} readonly /><section><h3 className="mb-2 font-semibold theme-text">Current assigned staff</h3>{modal.role.assigned_staff.length ? <ul className="space-y-2">{modal.role.assigned_staff.map((person) => <li key={person.assignment_id} className="rounded-md border theme-border p-3"><span className="font-medium theme-text">{person.name || person.email}</span><span className="ml-2 text-sm theme-muted">{person.membership_status}</span></li>)}</ul> : <p className="text-sm theme-muted">No active staff assignments.</p>}</section></div> : <div className="space-y-4"><Input id="role-name" label="Role name" value={name} onChange={(event) => setName(event.target.value)} required /><Input id="role-description" label="Description" value={description} onChange={(event) => setDescription(event.target.value)} /><PermissionMatrix permissions={permissionsQuery.data ?? []} selected={permissionKeys} onToggle={(key) => setPermissionKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} /></div>}
    </Modal>
  </div>;
}

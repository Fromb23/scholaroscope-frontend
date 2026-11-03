'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { PrincipalGovernanceModal } from './PrincipalGovernanceModal';

type Tab = 'roles' | 'assignments';
type RoleModal = { mode: 'view' | 'create' | 'edit'; role?: WorkspaceRole } | null;

export function WorkspaceRolesPage() {
  const access = useWorkspaceAccess();
  const { rolesQuery, permissionsQuery, staffAssignmentsQuery, assignmentOptionsQuery, meQuery, principalQuery, actions } = access;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roles = rolesQuery.data?.results ?? [];
  const summary = rolesQuery.data?.summary;
  const tab: Tab = searchParams.get('tab') === 'assignments' ? 'assignments' : 'roles';
  const roleParam = Number(searchParams.get('role')) || null;
  const staffParam = Number(searchParams.get('staff')) || null;
  const [modal, setModal] = useState<RoleModal>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<AppError | null>(null);
  const [principalOpen, setPrincipalOpen] = useState(false);
  const navigate = (changes: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    const href = `${pathname}?${next.toString()}`;
    if (replace) router.replace(href); else router.push(href);
  };
  const setTab = (next: Tab) => navigate({ tab: next, role: null, staff: null });
  const viewedRole = roles.find((role) => role.id === roleParam) ?? null;

  useEffect(() => {
    const role = modal?.role;
    setName(role?.name ?? ''); setDescription(role?.description ?? ''); setPermissionKeys(role?.permission_keys ?? []);
  }, [modal]);
  useEffect(() => {
    if (!rolesQuery.isSuccess || roleParam === null || viewedRole) return;
    setFeedback('That role is unavailable in this workspace.');
    navigate({ role: null, tab: 'roles' }, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleParam, rolesQuery.isSuccess, viewedRole]);
  useEffect(() => {
    if (!staffAssignmentsQuery.isSuccess || staffParam === null) return;
    if ((staffAssignmentsQuery.data ?? []).some((person) => person.membership_id === staffParam)) return;
    setFeedback('That staff assignment is unavailable in this workspace.');
    navigate({ staff: null, tab: 'assignments' }, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffAssignmentsQuery.data, staffAssignmentsQuery.isSuccess, staffParam]);

  const error = rolesQuery.error || permissionsQuery.error || meQuery.error || staffAssignmentsQuery.error;
  const loading = rolesQuery.isLoading || permissionsQuery.isLoading || meQuery.isLoading || staffAssignmentsQuery.isLoading || principalQuery.isLoading;
  const mutate = async (work: () => Promise<unknown>, message: string) => {
    setMutationError(null);
    try { await work(); setFeedback(message); setModal(null); }
    catch (caught) {
      setMutationError(resolveWorkspaceError(caught, { action: 'update', entityLabel: 'workspace role', channel: 'inline' }));
      throw caught;
    }
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
    <div role="tablist" aria-label="Workspace role management" className="flex gap-1 border-b theme-border"><button role="tab" aria-selected={tab === 'roles'} className={`px-4 py-3 text-sm font-medium ${tab === 'roles' ? 'border-b-2 border-blue-500 theme-text' : 'theme-muted'}`} onClick={() => setTab('roles')}>Roles</button><button role="tab" aria-selected={tab === 'assignments'} className={`px-4 py-3 text-sm font-medium ${tab === 'assignments' ? 'border-b-2 border-blue-500 theme-text' : 'theme-muted'}`} onClick={() => setTab('assignments')}>Staff assignments</button></div>

    {tab === 'roles' ? <section role="tabpanel" className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Total roles', summary?.total_roles], ['System roles', summary?.system_roles], ['Custom roles', summary?.custom_roles], ['Active role assignments', summary?.active_role_assignments]].map(([label, value]) => <div key={String(label)} className="rounded-md border theme-border p-4"><p className="text-sm theme-muted">{label}</p><p className="mt-1 text-2xl font-bold theme-text">{value ?? 0}</p></div>)}</div>
      {roles.length === 0 ? <div className="rounded-md border theme-border p-8 text-center"><p className="font-medium theme-text">No roles found</p><p className="mt-1 text-sm theme-muted">Create a custom role to compose delegable workspace permissions.</p></div> : <div className="overflow-x-auto rounded-md border theme-border"><table className="w-full min-w-[960px] text-left text-sm"><thead className="border-b theme-border bg-black/5 text-xs uppercase theme-subtle"><tr>{['Role', 'Type', 'Responsibility', 'Permissions', 'Assigned staff', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y theme-border">{roles.map((role) => <tr key={role.id}><td className="px-4 py-4"><div className="flex items-center gap-2"><span className="font-semibold theme-text">{role.name}</span>{role.is_system_managed ? <ShieldCheck aria-label="Protected system role" className="h-4 w-4 text-blue-500" /> : null}</div><p className="mt-1 max-w-xs text-xs theme-muted">{role.description || 'No description'}</p>{role.responsibility_type === 'OVERSIGHT' ? <p className="mt-2 text-xs text-blue-700">Principal oversight is managed through the institution-governance lifecycle.</p> : null}</td><td className="px-4 py-4"><span className="rounded-full bg-black/5 px-2 py-1 text-xs">{role.is_system_managed ? 'System' : 'Custom'}</span></td><td className="px-4 py-4">{role.responsibility_type === 'NONE' ? 'Operational' : role.responsibility_type.toLowerCase()}</td><td className="px-4 py-4">{role.permission_count}</td><td className="px-4 py-4">{role.active_assignment_count}</td><td className="px-4 py-4">{role.is_active ? 'Active' : 'Archived'}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => navigate({ tab: 'roles', role: String(role.id), staff: null })}>View</Button>{role.actions.can_update ? <Button size="sm" variant="secondary" onClick={() => setModal({ mode: 'edit', role })}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button> : null}{role.actions.can_archive ? <Button size="sm" variant="secondary" onClick={() => { if (window.confirm(`Archive ${role.name}? Existing historical assignments will be preserved.`)) void mutate(() => actions.archiveRole.mutateAsync(role.id), 'Role archived.'); }}><Trash2 className="mr-1 h-3.5 w-3.5" />Archive</Button> : null}{role.responsibility_type === 'OVERSIGHT' && role.actions.can_manage_principal ? <Button size="sm" onClick={() => setPrincipalOpen(true)}>{principalQuery.data?.current ? 'Manage Principal' : 'Appoint Principal'}</Button> : role.actions.can_assign ? <Button size="sm" variant="secondary" onClick={() => setTab('assignments')}><UserPlus className="mr-1 h-3.5 w-3.5" />Assign staff</Button> : null}</div>{role.is_system_managed && !role.actions.can_update ? <p className="mt-2 max-w-xs text-xs theme-subtle">{role.action_explanations.update}</p> : null}</td></tr>)}</tbody></table></div>}
    </section> : <section role="tabpanel" className="space-y-3"><div><h2 className="font-semibold theme-text">Staff role assignments</h2><p className="text-sm theme-muted">Each staff member appears once. Labels below are workspace roles, not membership classifications.</p></div><RoleAssignmentPanel roles={roles} staff={staffAssignmentsQuery.data ?? []} scopeOptions={assignmentOptionsQuery.data?.scope_options ?? []} selectedMembershipId={staffParam} onSelectedMembershipChange={(id) => navigate({ tab: 'assignments', staff: id ? String(id) : null }, id === null)} assigning={actions.assignRole.isPending} ending={actions.endAssignment.isPending} onAssign={(payload) => mutate(() => actions.assignRole.mutateAsync(payload), 'Role assigned.').then(() => undefined)} onEnd={(assignmentId) => mutate(() => actions.endAssignment.mutateAsync({ assignmentId }), 'Role removed.').then(() => undefined)} /></section>}

    <Modal isOpen={Boolean(modal || viewedRole)} onClose={() => { setModal(null); navigate({ role: null, tab: 'roles' }, true); }} title={modal?.mode === 'create' ? 'Create role' : modal?.mode === 'edit' ? `Edit ${modal.role?.name}` : viewedRole?.name ?? 'Role details'} description={viewedRole ? 'Inspect this role’s exact permission bundle and current staff assignments.' : 'Custom roles compose existing delegable permissions; role names do not grant authority.'} size="xl" footer={!viewedRole ? <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button disabled={!name.trim() || actions.createRole.isPending || actions.updateRole.isPending} onClick={() => void saveRole()}>{actions.createRole.isPending || actions.updateRole.isPending ? 'Saving role…' : 'Save role'}</Button></div> : <Button variant="secondary" onClick={() => navigate({ role: null, tab: 'roles' }, true)}>Close</Button>}>
      {viewedRole ? <div className="space-y-5"><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs theme-subtle">Type</dt><dd className="theme-text">{viewedRole.is_system_managed ? 'Protected system role' : 'Custom role'}</dd></div><div><dt className="text-xs theme-subtle">Responsibility</dt><dd className="theme-text">{viewedRole.responsibility_type}</dd></div><div><dt className="text-xs theme-subtle">Scope behaviour</dt><dd className="theme-text">{viewedRole.assignment_scope_policy?.allowed_scope_types.join(', ') || 'No assignable scope'}</dd></div><div><dt className="text-xs theme-subtle">Updated</dt><dd className="theme-text">{new Date(viewedRole.updated_at).toLocaleString()}</dd></div></dl>{viewedRole.responsibility_type === 'OVERSIGHT' ? <div className="rounded-md bg-blue-500/10 p-3 text-sm theme-text">Principal oversight is managed through the institution-governance lifecycle.</div> : null}<PermissionMatrix permissions={(permissionsQuery.data ?? []).filter((permission) => viewedRole.permission_keys.includes(permission.key))} selected={viewedRole.permission_keys} onToggle={() => undefined} readonly /><section><h3 className="mb-2 font-semibold theme-text">Current assigned staff</h3>{viewedRole.assigned_staff.length ? <ul className="space-y-2">{viewedRole.assigned_staff.map((person) => <li key={person.assignment_id} className="flex items-center justify-between rounded-md border theme-border p-3"><div><span className="font-medium theme-text">{person.name || person.email}</span><span className="ml-2 text-sm theme-muted">{person.membership_status}</span><p className="mt-1 text-xs theme-muted">{person.scopes.map((scope) => scope.scope_type).join(', ')}</p></div>{meQuery.data?.permission_keys.includes('workspace.roles.assign') ? <Button size="sm" variant="secondary" onClick={() => navigate({ tab: 'assignments', role: null, staff: String(person.membership_id) })}>Manage roles</Button> : null}</li>)}</ul> : <p className="text-sm theme-muted">No active staff assignments.</p>}</section></div> : <div className="space-y-4"><Input id="role-name" label="Role name" value={name} onChange={(event) => setName(event.target.value)} required /><Input id="role-description" label="Description" value={description} onChange={(event) => setDescription(event.target.value)} /><PermissionMatrix permissions={permissionsQuery.data ?? []} selected={permissionKeys} onToggle={(key) => setPermissionKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} /></div>}
    </Modal>
    <PrincipalGovernanceModal open={principalOpen} governance={principalQuery.data} staff={staffAssignmentsQuery.data ?? []} pending={actions.mutatePrincipal.isPending} onClose={() => setPrincipalOpen(false)} onSubmit={(payload) => mutate(() => actions.mutatePrincipal.mutateAsync(payload), 'Principal governance updated.').then(() => { setPrincipalOpen(false); })} />
  </div>;
}

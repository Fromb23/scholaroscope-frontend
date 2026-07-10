'use client';

import { useMemo, useState } from 'react';
import { CopyPlus, ShieldCheck, Trash2 } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useWorkspaceAccess } from '@/app/core/hooks/useWorkspaceAccess';
import type { WorkspaceRole } from '@/app/core/types/workspaceAccess';
import { AdminSlotSummary } from './AdminSlotSummary';
import { PermissionMatrix } from './PermissionMatrix';
import { RoleAssignmentPanel } from './RoleAssignmentPanel';

function RoleList({
  roles,
  selectedRoleId,
  onSelect,
}: {
  roles: WorkspaceRole[];
  selectedRoleId: number | null;
  onSelect: (role: WorkspaceRole) => void;
}) {
  return (
    <div className="rounded-md border theme-border">
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          onClick={() => onSelect(role)}
          className={`flex w-full items-start justify-between gap-3 border-b theme-border p-4 text-left last:border-b-0 ${
            selectedRoleId === role.id ? 'bg-blue-500/10' : 'theme-hover-surface'
          }`}
        >
          <div>
            <p className="font-semibold theme-text">{role.name}</p>
            <p className="theme-muted text-sm">{role.description || 'No description'}</p>
            <p className="theme-subtle mt-1 text-xs">
              {role.role_kind.toLowerCase()} · {role.permission_count} permissions · {role.active_assignment_count} assignments
            </p>
          </div>
          {role.is_workspace_admin ? <ShieldCheck className="h-5 w-5 text-blue-500" /> : null}
        </button>
      ))}
    </div>
  );
}

export function WorkspaceRolesPage() {
  const {
    permissionsQuery,
    templatesQuery,
    rolesQuery,
    assignmentsQuery,
    meQuery,
    actions,
  } = useWorkspaceAccess();
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const permissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data]);
  const assignments = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? roles[0],
    [roles, selectedRoleId]
  );
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const loading = rolesQuery.isLoading || permissionsQuery.isLoading || meQuery.isLoading;

  const startFromRole = (role: WorkspaceRole) => {
    setSelectedRoleId(role.id);
    setDraftName(role.name);
    setDraftDescription(role.description);
    setDraftPermissions(role.permission_keys);
  };

  const togglePermission = (key: string) => {
    setDraftPermissions((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  };

  const saveRole = async () => {
    if (selectedRole && !selectedRole.is_system_managed && selectedRoleId === selectedRole.id) {
      await actions.updateRole.mutateAsync({
        roleId: selectedRole.id,
        payload: {
          name: draftName,
          description: draftDescription,
          permission_keys: draftPermissions,
        },
      });
      return;
    }
    await actions.createRole.mutateAsync({
      name: draftName,
      description: draftDescription,
      permission_keys: draftPermissions,
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen={false} message="Loading workspace access..." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold theme-text">Workspace roles</h1>
        <p className="theme-muted mt-1 text-sm">
          Role names are labels. Access is determined by permissions, assignments and scopes returned by the backend.
        </p>
      </div>

      <AdminSlotSummary access={meQuery.data} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <RoleList
            roles={roles}
            selectedRoleId={selectedRole?.id ?? null}
            onSelect={startFromRole}
          />
          <div className="rounded-md border theme-border p-4">
            <p className="mb-3 text-sm font-semibold theme-text">Role templates</p>
            <div className="space-y-2">
              {(templatesQuery.data ?? []).map((template) => (
                <Button
                  key={template.id}
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => actions.cloneTemplate.mutate({ templateId: template.id })}
                >
                  <CopyPlus className="mr-2 h-4 w-4" />
                  Clone {template.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-md border theme-border p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Role name"
              id="workspace-role-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="e.g. Examination Coordinator"
              disabled={selectedRole?.is_system_managed}
            />
            <Input
              label="Description"
              id="workspace-role-description"
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              placeholder="What this role is used for"
              disabled={selectedRole?.is_system_managed}
            />
          </div>
          <PermissionMatrix
            permissions={permissions}
            selected={draftPermissions}
            onToggle={togglePermission}
            readonly={selectedRole?.is_system_managed}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => void saveRole()}
              disabled={!draftName.trim() || selectedRole?.is_system_managed || actions.createRole.isPending || actions.updateRole.isPending}
            >
              Save role
            </Button>
            {selectedRole && selectedRole.actions.can_archive ? (
              <Button
                variant="danger"
                onClick={() => actions.archiveRole.mutate(selectedRole.id)}
                disabled={actions.archiveRole.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Archive
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <RoleAssignmentPanel
        roles={roles}
        assignments={assignments}
        onAssign={async (payload) => {
          await actions.assignRole.mutateAsync(payload);
        }}
        onEnd={async (assignmentId, reason) => {
          await actions.endAssignment.mutateAsync({ assignmentId, reason });
        }}
        assigning={actions.assignRole.isPending}
        ending={actions.endAssignment.isPending}
      />
    </div>
  );
}

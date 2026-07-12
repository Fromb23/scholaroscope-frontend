import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { workspaceAccessAPI } from '@/app/core/api/workspaceAccess';
import { resolveWorkspaceError, type AppError } from '@/app/core/errors';
import type { WorkspaceRoleAssignmentPayload, WorkspaceRolePayload } from '@/app/core/types/workspaceAccess';

export const workspaceAccessKeys = {
  permissions: ['workspace-access', 'permissions'] as const,
  templates: ['workspace-access', 'templates'] as const,
  roles: ['workspace-access', 'roles'] as const,
  assignments: ['workspace-access', 'assignments'] as const,
  assignmentOptions: ['workspace-access', 'assignment-options'] as const,
  me: ['workspace-access', 'me'] as const,
};

export function useWorkspaceAccess() {
  const queryClient = useQueryClient();
  const permissionsQuery = useQuery({
    queryKey: workspaceAccessKeys.permissions,
    queryFn: workspaceAccessAPI.getPermissions,
  });
  const templatesQuery = useQuery({
    queryKey: workspaceAccessKeys.templates,
    queryFn: workspaceAccessAPI.getTemplates,
  });
  const rolesQuery = useQuery({
    queryKey: workspaceAccessKeys.roles,
    queryFn: workspaceAccessAPI.getRoles,
  });
  const assignmentsQuery = useQuery({
    queryKey: workspaceAccessKeys.assignments,
    queryFn: workspaceAccessAPI.getAssignments,
  });
  const meQuery = useQuery({
    queryKey: workspaceAccessKeys.me,
    queryFn: workspaceAccessAPI.getMe,
  });
  const roleActionsAllowAssignment = rolesQuery.data?.some(
    (role) => role.actions.can_assign && role.is_active,
  ) ?? false;
  const meHasAssignmentPermission = meQuery.data?.permission_keys.includes(
    'workspace.roles.assign',
  ) ?? false;
  const canLoadAssignmentOptions = Boolean(
    rolesQuery.isSuccess
    && meQuery.isSuccess
    && (roleActionsAllowAssignment || meHasAssignmentPermission),
  );
  const assignmentOptionsQuery = useQuery({
    queryKey: workspaceAccessKeys.assignmentOptions,
    queryFn: workspaceAccessAPI.getAssignmentOptions,
    enabled: canLoadAssignmentOptions,
  });
  const assignmentOptionsError = useMemo<AppError | null>(() => (
    assignmentOptionsQuery.error
      ? resolveWorkspaceError(assignmentOptionsQuery.error, {
        action: 'load',
        entityLabel: 'role assignment options',
        channel: 'inline',
      })
      : null
  ), [assignmentOptionsQuery.error]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.roles });
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.assignments });
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.assignmentOptions });
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.me });
  };

  const createRole = useMutation({
    mutationFn: (payload: WorkspaceRolePayload) => workspaceAccessAPI.createRole(payload),
    onSuccess: invalidate,
  });
  const updateRole = useMutation({
    mutationFn: ({ roleId, payload }: { roleId: number; payload: Partial<WorkspaceRolePayload> }) =>
      workspaceAccessAPI.updateRole(roleId, payload),
    onSuccess: invalidate,
  });
  const archiveRole = useMutation({
    mutationFn: (roleId: number) => workspaceAccessAPI.archiveRole(roleId),
    onSuccess: invalidate,
  });
  const cloneTemplate = useMutation({
    mutationFn: ({ templateId, name }: { templateId: number; name?: string }) =>
      workspaceAccessAPI.cloneTemplate(templateId, name),
    onSuccess: invalidate,
  });
  const assignRole = useMutation({
    mutationFn: (payload: WorkspaceRoleAssignmentPayload) => workspaceAccessAPI.assignRole(payload),
    onSuccess: invalidate,
  });
  const endAssignment = useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: number; reason: string }) =>
      workspaceAccessAPI.endAssignment(assignmentId, reason),
    onSuccess: invalidate,
  });

  return {
    permissionsQuery,
    templatesQuery,
    rolesQuery,
    assignmentsQuery,
    assignmentOptionsQuery,
    assignmentOptionsError,
    meQuery,
    actions: {
      createRole,
      updateRole,
      archiveRole,
      cloneTemplate,
      assignRole,
      endAssignment,
    },
  };
}

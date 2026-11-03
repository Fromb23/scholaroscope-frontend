import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { workspaceAccessAPI } from '@/app/core/api/workspaceAccess';
import { resolveWorkspaceError, type AppError } from '@/app/core/errors';
import type { PrincipalGovernancePayload, WorkspaceRoleAssignmentPayload, WorkspaceRolePayload } from '@/app/core/types/workspaceAccess';
import { useOrganizationContext } from '@/app/context/OrganizationContext';

export const workspaceAccessKeys = {
  permissions: (organizationId: number | null) => ['workspace-access', organizationId, 'permissions'] as const,
  templates: (organizationId: number | null) => ['workspace-access', organizationId, 'templates'] as const,
  roles: (organizationId: number | null) => ['workspace-access', organizationId, 'roles'] as const,
  assignments: (organizationId: number | null) => ['workspace-access', organizationId, 'assignments'] as const,
  staffAssignments: (organizationId: number | null) => ['workspace-access', organizationId, 'staff-assignments'] as const,
  assignmentOptions: (organizationId: number | null) => ['workspace-access', organizationId, 'assignment-options'] as const,
  me: (organizationId: number | null) => ['workspace-access', organizationId, 'me'] as const,
  principal: (organizationId: number | null) => ['workspace-access', organizationId, 'principal-governance'] as const,
};

export function useWorkspaceAccess() {
  const { organizationId } = useOrganizationContext();
  const queryClient = useQueryClient();
  const permissionsQuery = useQuery({
    queryKey: workspaceAccessKeys.permissions(organizationId),
    queryFn: workspaceAccessAPI.getPermissions,
  });
  const templatesQuery = useQuery({
    queryKey: workspaceAccessKeys.templates(organizationId),
    queryFn: workspaceAccessAPI.getTemplates,
  });
  const rolesQuery = useQuery({
    queryKey: workspaceAccessKeys.roles(organizationId),
    queryFn: workspaceAccessAPI.getRoleCatalogue,
  });
  const roles = rolesQuery.data?.results;
  const assignmentsQuery = useQuery({
    queryKey: workspaceAccessKeys.assignments(organizationId),
    queryFn: workspaceAccessAPI.getAssignments,
  });
  const meQuery = useQuery({
    queryKey: workspaceAccessKeys.me(organizationId),
    queryFn: workspaceAccessAPI.getMe,
  });
  const roleActionsAllowAssignment = roles?.some(
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
    queryKey: workspaceAccessKeys.assignmentOptions(organizationId),
    queryFn: workspaceAccessAPI.getAssignmentOptions,
    enabled: canLoadAssignmentOptions,
  });
  const staffAssignmentsQuery = useQuery({
    queryKey: workspaceAccessKeys.staffAssignments(organizationId),
    queryFn: workspaceAccessAPI.getStaffAssignments,
  });
  const principalQuery = useQuery({
    queryKey: workspaceAccessKeys.principal(organizationId),
    queryFn: workspaceAccessAPI.getPrincipalGovernance,
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
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.roles(organizationId) });
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.assignments(organizationId) });
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.staffAssignments(organizationId) });
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.assignmentOptions(organizationId) });
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.me(organizationId) });
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.principal(organizationId) });
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
    mutationFn: ({ assignmentId, reason }: { assignmentId: number; reason?: string }) =>
      workspaceAccessAPI.endAssignment(assignmentId, reason),
    onSuccess: invalidate,
  });
  const mutatePrincipal = useMutation({
    mutationFn: (payload: PrincipalGovernancePayload) => workspaceAccessAPI.mutatePrincipalGovernance(payload),
    onSuccess: invalidate,
  });

  return {
    permissionsQuery,
    templatesQuery,
    rolesQuery,
    assignmentsQuery,
    staffAssignmentsQuery,
    assignmentOptionsQuery,
    assignmentOptionsError,
    meQuery,
    principalQuery,
    actions: {
      createRole,
      updateRole,
      archiveRole,
      cloneTemplate,
      assignRole,
      endAssignment,
      mutatePrincipal,
    },
  };
}

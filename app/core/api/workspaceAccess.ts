import { apiClient } from '@/app/core/api/client';
import { unwrapPaginated } from '@/app/core/api/unwrap';
import type {
  WorkspaceAccessMe,
  WorkspacePermissionDefinition,
  WorkspaceRole,
  WorkspaceRoleAssignment,
  WorkspaceRolePayload,
  WorkspaceRoleTemplate,
} from '@/app/core/types/workspaceAccess';

export const workspaceAccessAPI = {
  getPermissions: async (): Promise<WorkspacePermissionDefinition[]> => {
    const response = await apiClient.get<WorkspacePermissionDefinition[]>('/workspace-access/permissions/');
    return response.data;
  },

  getTemplates: async (): Promise<WorkspaceRoleTemplate[]> => {
    const response = await apiClient.get<WorkspaceRoleTemplate[]>('/workspace-access/templates/');
    return response.data;
  },

  getRoles: async (): Promise<WorkspaceRole[]> => {
    const response = await apiClient.get<WorkspaceRole[] | { results?: WorkspaceRole[] }>('/workspace-access/roles/');
    return unwrapPaginated(response.data);
  },

  createRole: async (payload: WorkspaceRolePayload): Promise<WorkspaceRole> => {
    const response = await apiClient.post<WorkspaceRole>('/workspace-access/roles/', payload);
    return response.data;
  },

  updateRole: async (roleId: number, payload: Partial<WorkspaceRolePayload>): Promise<WorkspaceRole> => {
    const response = await apiClient.patch<WorkspaceRole>(`/workspace-access/roles/${roleId}/`, payload);
    return response.data;
  },

  archiveRole: async (roleId: number): Promise<WorkspaceRole> => {
    const response = await apiClient.post<WorkspaceRole>(`/workspace-access/roles/${roleId}/archive/`);
    return response.data;
  },

  cloneTemplate: async (templateId: number, name?: string): Promise<WorkspaceRole> => {
    const response = await apiClient.post<WorkspaceRole>('/workspace-access/roles/clone-template/', {
      template_id: templateId,
      name,
    });
    return response.data;
  },

  getAssignments: async (): Promise<WorkspaceRoleAssignment[]> => {
    const response = await apiClient.get<WorkspaceRoleAssignment[] | { results?: WorkspaceRoleAssignment[] }>('/workspace-access/assignments/');
    return unwrapPaginated(response.data);
  },

  getMe: async (): Promise<WorkspaceAccessMe> => {
    const response = await apiClient.get<WorkspaceAccessMe>('/workspace-access/me/');
    return response.data;
  },
};

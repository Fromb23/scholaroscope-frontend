import { apiClient } from '@/app/core/api/client';
import type { OrgType } from '@/app/core/types/auth';

export interface CreateWorkspaceProvisioningPayload {
  workspace_name: string;
  quote_token: string;
  idempotency_key?: string;
}

export interface WorkspaceProvisioningResponse {
  status: 'provisioned';
  provisioning_request_id: number;
  organization: {
    id: number;
    name: string;
    slug: string;
    type: OrgType;
    status: string;
  };
  subscription_draft: {
    id: number;
    status: string;
    starts_on: string;
    ends_on: string;
    currency: string;
    base_price: string;
    premium_total: string;
    total_price: string;
    plan_code: string;
    plan_version: number;
  };
  quote: {
    token: string;
    commercial_mode: string;
    workspace_type: OrgType;
    total: string;
    currency: string;
    selected_premium_plugins: unknown[];
  };
}

export const workspaceProvisioningAPI = {
  createWorkspace: async (
    payload: CreateWorkspaceProvisioningPayload,
  ): Promise<WorkspaceProvisioningResponse> => {
    const response = await apiClient.post<WorkspaceProvisioningResponse>(
      '/workspace-provisioning/workspaces/',
      payload,
    );
    return response.data;
  },
};

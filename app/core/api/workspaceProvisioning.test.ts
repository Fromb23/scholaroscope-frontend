import { describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/app/core/api/client';
import { workspaceProvisioningAPI } from '@/app/core/api/workspaceProvisioning';

vi.mock('@/app/core/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('workspaceProvisioningAPI', () => {
  it('creates additional workspaces through the authenticated provisioning endpoint with provisioning-only payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        status: 'provisioned',
        provisioning_request_id: 7,
        organization: {
          id: 42,
          name: 'Rombo Mathematics',
          slug: 'rombo-mathematics',
          type: 'PERSONAL',
          status: 'ACTIVE',
        },
        subscription_draft: {
          id: 5,
          status: 'DRAFT',
          starts_on: '2026-07-26',
          ends_on: '2026-10-26',
          currency: 'KES',
          base_price: '1200.00',
          premium_total: '0.00',
          total_price: '1200.00',
          plan_code: 'PERSONAL_STANDARD',
          plan_version: 1,
        },
        quote: {
          token: 'quote-token',
          commercial_mode: 'STANDARD',
          workspace_type: 'PERSONAL',
          total: '1200.00',
          currency: 'KES',
          selected_premium_plugins: [],
        },
      },
    });

    await workspaceProvisioningAPI.createWorkspace({
      workspace_name: 'Rombo Mathematics',
      quote_token: 'quote-token',
      idempotency_key: 'submit-once',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/workspace-provisioning/workspaces/',
      {
        workspace_name: 'Rombo Mathematics',
        quote_token: 'quote-token',
        idempotency_key: 'submit-once',
      },
    );
    expect(vi.mocked(apiClient.post).mock.calls[0]?.[1]).not.toHaveProperty('email');
    expect(vi.mocked(apiClient.post).mock.calls[0]?.[1]).not.toHaveProperty('password');
    expect(vi.mocked(apiClient.post).mock.calls[0]?.[1]).not.toHaveProperty('completion_operation');
    expect(vi.mocked(apiClient.post).mock.calls[0]?.[1]).not.toHaveProperty('org_type');
  });
});

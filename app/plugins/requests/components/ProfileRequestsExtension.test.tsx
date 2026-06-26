import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { ProfileData } from '@/app/core/hooks/useProfile';

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/app/plugins/requests/hooks/useRequests', () => ({
  useMyRequests: () => ({
    requests: [],
    loading: false,
    submitDeletionRequest: vi.fn(),
    hasPendingDeletion: () => false,
  }),
}));

import { useAuth } from '@/app/context/AuthContext';
import { ProfileRequestsExtension } from './ProfileRequestsExtension';

const profile: ProfileData = {
  id: 1,
  email: 'teacher@example.test',
  first_name: 'Test',
  last_name: 'Teacher',
  full_name: 'Test Teacher',
  phone: '',
  role: 'ADMIN',
  role_display: 'Admin',
  organization: 1,
  organization_name: 'Workspace',
  organization_code: 'WKS',
  is_active: true,
  date_joined: '2026-01-01T00:00:00Z',
  last_login: null,
};

const useAuthMock = vi.mocked(useAuth);

describe('profile requests extension workspace visibility', () => {
  it('hides membership request history for freelance teaching workspaces', () => {
    useAuthMock.mockReturnValue({
      activeOrg: { id: 1, name: 'Solo', org_type: 'PERSONAL' },
      capabilities: {
        workspace_behavior: 'FREELANCE_TEACHER',
      },
    } as ReturnType<typeof useAuth>);

    const html = renderToStaticMarkup(<ProfileRequestsExtension profile={profile} />);

    expect(html).not.toContain('My Recent Requests');
    expect(html).toContain('Delete My Account');
  });

  it('keeps request history for institution admins with the same raw role', () => {
    useAuthMock.mockReturnValue({
      activeOrg: { id: 2, name: 'Institution', org_type: 'INSTITUTION' },
      capabilities: {
        workspace_behavior: 'INSTITUTION',
      },
    } as ReturnType<typeof useAuth>);

    const html = renderToStaticMarkup(<ProfileRequestsExtension profile={profile} />);

    expect(html).toContain('My Recent Requests');
  });
});

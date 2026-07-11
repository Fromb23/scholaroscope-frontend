import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@/app/core/types/auth';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  authState: {} as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mocks.authState,
}));

import { TenantGuard } from '@/app/core/guards/TenantGuard';

const user: User = {
  id: 1,
  email: 'admin@example.test',
  first_name: 'Ada',
  last_name: 'Admin',
  full_name: 'Ada Admin',
  is_superadmin: false,
  is_active: true,
  phone: '',
  date_joined: '2026-01-01T00:00:00Z',
  last_login: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.authState = {
    user,
    activeOrg: null,
    loading: false,
  };
});

describe('runtime workspace suspension boundaries', () => {
  it('blocks protected children and sends the user to workspace recovery when active workspace is unavailable', () => {
    const html = renderToStaticMarkup(
      <TenantGuard>
        <p>Protected learner operations</p>
      </TenantGuard>,
    );

    expect(mocks.replace).toHaveBeenCalledWith('/workspaces/new?reason=suspended');
    expect(html).toContain('Switching workspace...');
    expect(html).not.toContain('Protected learner operations');
  });
});

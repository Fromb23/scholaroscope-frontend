import { createElement, useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstructorProgress } from './useInstructorProgress';
import { instructorsAPI } from '@/app/core/api/instructors';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/app/core/api/sessions', () => ({
  sessionAPI: { getSupervisedComplete: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/app/core/api/schemes', () => ({
  schemesAPI: { getInstructorSchemes: vi.fn().mockResolvedValue({ results: [] }) },
}));

function profile(membershipStatus: 'ACTIVE' | 'SUSPENDED') {
  return {
    id: 77,
    email: 'instructor@example.com',
    first_name: 'Ada',
    last_name: 'Teacher',
    full_name: 'Ada Teacher',
    is_superadmin: false,
    is_active: true,
    phone: '',
    date_joined: '2026-01-01',
    last_login: null,
    membership_status: membershipStatus,
    can_restrict_access: membershipStatus === 'ACTIVE',
    can_reactivate_access: membershipStatus === 'SUSPENDED',
    cohort_assignments: [],
    teaching_assignments: [],
    session_count: 0,
    last_session_at: null,
  };
}

describe('useInstructorProgress membership synchronization', () => {
  let renderer: ReactTestRenderer | null = null;
  let latest: ReturnType<typeof useInstructorProgress> | null = null;

  beforeEach(() => {
    latest = null;
    vi.spyOn(instructorsAPI, 'getById').mockResolvedValue(profile('ACTIVE'));
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = null;
    vi.restoreAllMocks();
  });

  async function renderHook() {
    function Probe() {
      const value = useInstructorProgress(77);
      useEffect(() => { latest = value; }, [value]);
      return null;
    }
    await act(async () => {
      renderer = create(createElement(Probe));
      await Promise.resolve();
    });
  }

  it('immediately changes ACTIVE to SUSPENDED without changing global account activity', async () => {
    await renderHook();
    await act(async () => {
      latest?.applyMembershipAction({
        membership_status: 'SUSPENDED',
        user: { ...profile('SUSPENDED') },
      });
    });

    expect(latest?.instructor).toMatchObject({
      membership_status: 'SUSPENDED',
      is_active: true,
      can_restrict_access: false,
      can_reactivate_access: true,
    });
  });

  it('immediately changes SUSPENDED to ACTIVE and reports a failed background refresh', async () => {
    await renderHook();
    await act(async () => {
      latest?.applyMembershipAction({ membership_status: 'SUSPENDED' });
    });
    await act(async () => {
      latest?.applyMembershipAction({ membership_status: 'ACTIVE' });
    });
    expect(latest?.instructor).toMatchObject({
      membership_status: 'ACTIVE',
      can_restrict_access: true,
      can_reactivate_access: false,
    });

    vi.mocked(instructorsAPI.getById).mockRejectedValueOnce(new Error('profile unavailable'));
    let refreshError: unknown;
    await act(async () => {
      try {
        await latest?.refetch();
      } catch (caught) {
        refreshError = caught;
      }
    });
    expect(refreshError).toBeInstanceOf(Error);
    expect((refreshError as Error).message).toBe('Failed to refresh staff profile');
    expect(latest?.instructor?.membership_status).toBe('ACTIVE');
    expect(latest?.refreshError).toBe('Failed to refresh staff profile');
  });
});

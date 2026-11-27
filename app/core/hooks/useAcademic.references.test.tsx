import { createElement, useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAcademicYears } from './useAcademic';

const mocks = vi.hoisted(() => ({
  getAcademicYears: vi.fn(),
}));

vi.mock('@/app/core/api/academic', () => ({
  academicYearAPI: { getAll: mocks.getAcademicYears },
  academicLifecycleAPI: {},
  termAPI: {},
  termCalendarEventAPI: {},
  curriculumAPI: {},
  subjectAPI: {},
  cohortAPI: {},
  cohortSubjectAPI: {},
  learnerSubjectOptionsAPI: {},
}));

vi.mock('@/app/context/OrganizationContext', () => ({
  useOrganizationContext: () => ({ organizationId: 7 }),
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 11 },
    activeOperatingContext: 'WORKSPACE_MANAGEMENT',
    workspaceGeneration: 3,
  }),
}));

vi.mock('@/app/core/hooks/useInstructorCohortAccess', () => ({
  useInstructorCohortAccess: () => ({
    hasTeachingProjection: false,
    hasManagementProjection: true,
    subjectIdsKey: '',
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const snapshots: Array<ReturnType<typeof useAcademicYears>> = [];

function Consumer() {
  const state = useAcademicYears();
  useEffect(() => {
    snapshots.push(state);
  }, [state]);
  return createElement('academic-years-consumer');
}

describe('shared academic reference queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    snapshots.length = 0;
  });

  it('deduplicates concurrent consumers with the same workspace and filters', async () => {
    let resolveRequest!: (value: unknown[]) => void;
    mocks.getAcademicYears.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let renderer!: ReactTestRenderer;

    await act(async () => {
      renderer = create(createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement('reference-consumers', null, createElement(Consumer), createElement(Consumer)),
      ));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mocks.getAcademicYears).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest([{ id: 1, name: '2026' }]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await vi.waitFor(() => {
      expect(snapshots.at(-1)?.academicYears).toEqual([{ id: 1, name: '2026' }]);
    });
    await act(async () => renderer.unmount());
  });
});

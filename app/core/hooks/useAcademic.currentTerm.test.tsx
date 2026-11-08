import { createElement, useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentTerm } from './useAcademic';

const mocks = vi.hoisted(() => ({
  getCurrentTerm: vi.fn(),
}));

vi.mock('@/app/core/api/academic', () => ({
  academicYearAPI: {},
  academicLifecycleAPI: {},
  termAPI: { getCurrent: mocks.getCurrentTerm },
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

vi.mock('@/app/core/hooks/useInstructorCohortAccess', () => ({
  useInstructorCohortAccess: () => ({
    hasTeachingProjection: false,
    hasManagementProjection: false,
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let latest: ReturnType<typeof useCurrentTerm>;

function Harness() {
  const state = useCurrentTerm();
  useEffect(() => {
    latest = state;
  }, [state]);
  return createElement('term-state', {
    loading: state.loading,
    error: state.error,
    noActiveTerm: state.noActiveTerm,
  });
}

async function renderHarness() {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(Harness));
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
}

describe('useCurrentTerm expected empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats only the structured no_active_term 404 as an expected state without refetching', async () => {
    mocks.getCurrentTerm.mockRejectedValue({
      response: {
        status: 404,
        data: {
          error: {
            type: 'not_found',
            code: 'no_active_term',
            message: 'There is no active term.',
          },
        },
      },
    });
    const renderer = await renderHarness();

    expect(latest).toMatchObject({
      currentTerm: null,
      loading: false,
      error: null,
      noActiveTerm: true,
    });
    expect(mocks.getCurrentTerm).toHaveBeenCalledTimes(1);
    expect(mocks.getCurrentTerm).toHaveBeenCalledWith({ organization: 7 });

    await act(async () => {
      renderer.update(createElement(Harness));
      await Promise.resolve();
    });
    expect(mocks.getCurrentTerm).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });

  it('keeps a different 404 distinguishable as a genuine context error', async () => {
    mocks.getCurrentTerm.mockRejectedValue({
      response: {
        status: 404,
        data: {
          error: {
            type: 'not_found',
            code: 'term_scope_not_found',
            message: 'Term scope was not found.',
          },
        },
      },
    });
    const renderer = await renderHarness();

    expect(latest.currentTerm).toBeNull();
    expect(latest.noActiveTerm).toBe(false);
    expect(latest.error).toBeTruthy();
    expect(mocks.getCurrentTerm).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });
});

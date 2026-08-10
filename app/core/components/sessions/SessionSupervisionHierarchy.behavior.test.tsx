import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cohorts: vi.fn(),
  sessions: vi.fn(),
  subjects: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/sessions',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('term=7'),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    createElement('a', { href }, children)
  ),
}));

vi.mock('@/app/core/hooks/useSessionSupervisionHierarchy', () => ({
  useSupervisionSubjects: (...args: unknown[]) => mocks.subjects(...args),
  useSupervisionCohorts: (...args: unknown[]) => mocks.cohorts(...args),
  useSupervisionSessions: (...args: unknown[]) => mocks.sessions(...args),
}));

import { SessionSupervisionHierarchy } from './SessionSupervisionHierarchy';

describe('SessionSupervisionHierarchy initial rendering', () => {
  it('renders subject discovery only and leaves cohort/session branches disabled', () => {
    mocks.subjects.mockReturnValue({
      data: {
        subjects: [
          { key: 'kernel:1', id: 1, source: 'kernel', name: 'Computer Studies', code: 'CSC', cohort_count: 2, session_count: 9 },
          { key: 'kernel:2', id: 2, source: 'kernel', name: 'ICT', code: 'ICT', cohort_count: 1, session_count: 3 },
        ],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    });
    mocks.cohorts.mockReturnValue({ data: null, loading: false, error: null, retry: vi.fn() });
    mocks.sessions.mockReturnValue({ data: [], loading: false, error: null, retry: vi.fn() });

    const html = renderToStaticMarkup(createElement(SessionSupervisionHierarchy, {
      workspaceId: 5,
      termId: 7,
      authorityMode: 'supervision',
    }));

    expect(html).toContain('Computer Studies');
    expect(html).toContain('ICT');
    expect(html).not.toContain('Grade 10 Green');
    expect(mocks.cohorts).toHaveBeenCalledWith(null, false);
    expect(mocks.sessions).toHaveBeenCalledWith(null, false);
  });
});

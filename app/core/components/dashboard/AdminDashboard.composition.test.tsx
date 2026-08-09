import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ selfManaged: true }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>{children}</a>
    ),
}));
vi.mock('@/app/context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, first_name: 'Amina' },
        activeOrg: { id: 4, name: 'Test Workspace' },
        activeOperatingContext: 'WORKSPACE_MANAGEMENT',
        capabilities: { can_manage_academic_setup: true, can_teach: state.selfManaged },
    }),
}));
vi.mock('@/app/core/hooks/useInstructorCohortAccess', () => ({
    useInstructorCohortAccess: () => ({ isSelfManagedTeachingAdmin: state.selfManaged }),
}));
vi.mock('@/app/core/hooks/useAcademicSetupStatus', () => ({
    useAcademicSetupStatus: () => ({ data: { complete: true }, isLoading: false }),
}));
vi.mock('@/app/core/hooks/useAcademic', () => ({
    useAcademicLifecycleContext: () => ({ data: null }),
}));
vi.mock('@/app/core/hooks/useAdminDashboard', () => ({
    useAdminDashboard: () => ({
        sessions: [], currentTerm: null, academicContexts: [], attentionItems: [],
        weekIndicators: [], upcomingAssessments: [], lastRefresh: new Date(0),
        isLoading: false, refresh: vi.fn(),
    }),
}));
vi.mock('@/app/core/components/assistant/useAssistantPageContext', () => ({ useAssistantPageContext: vi.fn() }));
vi.mock('@/app/core/components/dashboard/InstructorDashboard', () => ({
    InstructorDashboard: ({ embeddedInManagement }: { embeddedInManagement?: boolean }) => (
        <div data-testid="teaching-workspace">{embeddedInManagement ? 'My teaching workspace' : 'Teaching'}</div>
    ),
}));

import { AdminDashboard } from './AdminDashboard';

describe('AdminDashboard composition', () => {
    let renderer: ReactTestRenderer | null = null;
    beforeEach(() => { state.selfManaged = true; renderer?.unmount(); renderer = null; });

    it('renders visible teaching content for a self-managed owner in workspace management', () => {
        act(() => { renderer = create(<AdminDashboard />); });

        expect(renderer!.root.findByProps({ 'data-testid': 'teaching-workspace' }).children).toContain('My teaching workspace');
        expect(renderer!.toJSON()).not.toBeNull();
    });

    it('keeps an institution manager on the administrative dashboard', () => {
        state.selfManaged = false;
        act(() => { renderer = create(<AdminDashboard />); });

        expect(renderer!.root.findAllByProps({ 'data-testid': 'teaching-workspace' })).toHaveLength(0);
        expect(renderer!.root.findByType('h1').children.join('')).toBe('Test Workspace');
    });
});

import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Term } from '@/app/core/types/academic';
import { TermsPage } from './TermsPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
    terms: [] as Term[],
    deleteTerm: vi.fn(),
    reopenCalendarSetup: vi.fn(),
    routerPush: vi.fn(),
    routerReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.routerPush, replace: mocks.routerReplace }),
    useSearchParams: () => new URLSearchParams('term=1'),
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/app/context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 9 },
        capabilities: {
            can_manage_academic_setup: true,
            authorization: {
                enforced: true,
                permission_keys: ['academic.terms.manage'],
                roles: [],
                operating_contexts: ['WORKSPACE_MANAGEMENT'],
            },
        },
    }),
}));

vi.mock('@/app/core/hooks/useAcademicSetupStatus', () => ({
    useAcademicSetupStatus: () => ({ data: null, isLoading: false, refetch: vi.fn() }),
}));

vi.mock('@/app/core/hooks/useSubscriptions', () => ({
    useWorkspaceSubscriptionSummary: () => ({ data: null }),
}));

vi.mock('@/app/core/components/academic/setup/AcademicSetupGate', () => ({
    AcademicSetupGate: () => null,
}));

vi.mock('@/app/core/hooks/useAcademic', () => ({
    useAcademicYears: () => ({
        academicYears: [{
            id: 2026,
            name: '2026 Academic Year',
            is_current: true,
            curriculum: 1,
            curriculum_name: 'CBC',
            start_date: '2026-01-01',
            end_date: '2026-12-31',
            terms_count: 1,
            cohorts_count: 1,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
        }],
        loading: false,
    }),
    useTerms: () => ({
        terms: mocks.terms,
        loading: false,
        createTerm: vi.fn(),
        updateTerm: vi.fn(),
        deleteTerm: mocks.deleteTerm,
        completeCalendarSetup: vi.fn(),
        reopenCalendarSetup: mocks.reopenCalendarSetup,
        refetch: vi.fn().mockResolvedValue(mocks.terms),
    }),
    useTermCalendarEvents: () => ({
        events: [],
        loading: false,
        error: null,
        createEvent: vi.fn(),
        updateEvent: vi.fn(),
        deleteEvent: vi.fn(),
        refetch: vi.fn().mockResolvedValue([]),
    }),
}));

function buildTerm(overrides: Partial<Term> = {}): Term {
    return {
        id: 1,
        academic_year: 2026,
        academic_year_name: '2026 Academic Year',
        name: 'Term 1',
        sequence: 1,
        start_date: '2026-09-01',
        end_date: '2026-12-31',
        status: 'OPEN',
        is_frozen: false,
        calendar_setup_completed_at: null,
        calendar_setup_completed_by: null,
        calendar_setup_completed_by_name: '',
        is_calendar_setup_complete: false,
        configuration_state: 'SETUP_OPEN',
        configuration_actions: {
            can_edit_term: true,
            can_delete_term: true,
            can_add_calendar_event: true,
            can_edit_calendar_event: true,
            can_delete_calendar_event: true,
            can_complete_setup: true,
            can_reopen_setup: false,
        },
        configuration_locked_reason: null,
        week_count: 13,
        actions: {
            can_edit: true,
            can_delete: true,
        },
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

function buttonContaining(renderer: ReactTestRenderer, label: string): ReactTestInstance {
    return renderer.root.findAll(
        (node) => {
            const children = Array.isArray(node.props.children)
                ? node.props.children
                : [node.props.children];
            return typeof node.props.onClick === 'function' && children.includes(label);
        },
    ).at(-1)!;
}

describe('TermsPage deletion journey', () => {
    let renderer: ReactTestRenderer | null = null;

    beforeEach(() => {
        mocks.deleteTerm.mockReset().mockResolvedValue(undefined);
        mocks.reopenCalendarSetup.mockReset();
        mocks.routerPush.mockReset();
        mocks.routerReplace.mockReset();
        vi.stubGlobal('confirm', vi.fn(() => true));
    });

    afterEach(async () => {
        await act(async () => renderer?.unmount());
        renderer = null;
        vi.unstubAllGlobals();
    });

    it('offers an accessible confirmed delete action for a permitted term', async () => {
        mocks.terms = [buildTerm()];

        await act(async () => {
            renderer = create(<TermsPage />);
        });

        const deleteButton = buttonContaining(renderer!, 'Delete term');
        expect(deleteButton).toBeDefined();
        await act(async () => deleteButton.props.onClick());

        expect(globalThis.confirm).toHaveBeenCalledWith('Delete "Term 1"? This cannot be undone.');
        expect(mocks.deleteTerm).toHaveBeenCalledWith(1);
    });

    it('explains a setup lock and exposes reopening without offering deletion', async () => {
        mocks.terms = [buildTerm({
            is_calendar_setup_complete: true,
            calendar_setup_completed_at: '2026-01-02T00:00:00Z',
            configuration_state: 'SETUP_LOCKED',
            configuration_actions: {
                can_edit_term: false,
                can_delete_term: false,
                can_add_calendar_event: false,
                can_edit_calendar_event: false,
                can_delete_calendar_event: false,
                can_complete_setup: false,
                can_reopen_setup: true,
            },
            configuration_locked_reason: 'Calendar setup is complete.',
            actions: {
                can_edit: false,
                can_delete: false,
                can_reopen_setup: true,
                delete_blocked_reason: 'Reopen setup before deleting this active term.',
            },
        })];

        await act(async () => {
            renderer = create(<TermsPage />);
        });

        const output = JSON.stringify(renderer!.toJSON());
        expect(output).toContain('Term deletion unavailable');
        expect(output).toContain('Reopen setup before deleting this active term.');
        expect(buttonContaining(renderer!, 'Reopen Setup')).toBeDefined();
        expect(renderer!.root.findAll(
            (node) => {
                const children = Array.isArray(node.props.children)
                    ? node.props.children
                    : [node.props.children];
                return typeof node.props.onClick === 'function' && children.includes('Delete term');
            },
        )).toHaveLength(0);
    });
});

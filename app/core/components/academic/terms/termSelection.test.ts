import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Term } from '@/app/core/types/academic';
import {
    canAddTermCalendarEvent,
    canCompleteTermCalendar,
    canDeleteTermCalendarEvent,
    canEditTermCalendar,
    canEditTermCalendarEvent,
    canReopenTermCalendar,
    resolveDefaultSelectedTerm,
    resolveSelectedTermId,
} from './termSelection';

function source(path: string): string {
    return readFileSync(join(process.cwd(), path), 'utf8');
}

function buildTerm(overrides: Partial<Term>): Term {
    return {
        id: 1,
        academic_year: 2026,
        academic_year_name: '2026',
        name: 'Term',
        sequence: 1,
        start_date: '2026-01-01',
        end_date: '2026-03-31',
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
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

describe('academic term default selection', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-12T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('selects the active term when an earlier term has ended', () => {
        const sem1 = buildTerm({
            id: 1,
            name: 'sem1',
            sequence: 1,
            start_date: '2026-01-01',
            end_date: '2026-06-30',
        });
        const sem2 = buildTerm({
            id: 2,
            name: 'Sem 2',
            sequence: 2,
            start_date: '2026-07-01',
            end_date: '2026-09-30',
        });

        expect(resolveDefaultSelectedTerm([sem1, sem2])?.id).toBe(2);
    });

    it('selects the earliest upcoming open term when no term is active', () => {
        const sem2 = buildTerm({
            id: 2,
            name: 'Sem 2',
            sequence: 2,
            start_date: '2026-10-01',
            end_date: '2026-12-15',
        });
        const sem1 = buildTerm({
            id: 1,
            name: 'sem1',
            sequence: 1,
            start_date: '2026-08-01',
            end_date: '2026-09-30',
        });

        expect(resolveDefaultSelectedTerm([sem2, sem1])?.id).toBe(1);
    });

    it('selects the most recently ended term when all terms have ended', () => {
        const sem1 = buildTerm({
            id: 1,
            name: 'sem1',
            start_date: '2026-01-01',
            end_date: '2026-03-31',
        });
        const sem2 = buildTerm({
            id: 2,
            name: 'Sem 2',
            start_date: '2026-04-01',
            end_date: '2026-06-30',
        });

        expect(resolveDefaultSelectedTerm([sem1, sem2])?.id).toBe(2);
    });

    it('does not treat a frozen current-date term as the active default', () => {
        const frozenCurrentTerm = buildTerm({
            id: 1,
            start_date: '2026-07-01',
            end_date: '2026-09-30',
            status: 'CLOSED_HISTORICAL',
            is_frozen: true,
        });
        const upcomingTerm = buildTerm({
            id: 2,
            start_date: '2026-10-01',
            end_date: '2026-12-15',
        });

        expect(resolveDefaultSelectedTerm([frozenCurrentTerm, upcomingTerm])?.id).toBe(2);
    });

    it('preserves an existing manual selection across a rerender or refetch', () => {
        const sem1 = buildTerm({
            id: 1,
            name: 'sem1',
            start_date: '2026-01-01',
            end_date: '2026-06-30',
        });
        const sem2 = buildTerm({
            id: 2,
            name: 'Sem 2',
            start_date: '2026-07-01',
            end_date: '2026-09-30',
        });

        expect(resolveSelectedTermId(1, [sem1, sem2])).toBe(1);
    });

    it('recalculates the default selection when the selected term is removed after refetch', () => {
        const sem2 = buildTerm({
            id: 2,
            name: 'Sem 2',
            start_date: '2026-07-01',
            end_date: '2026-09-30',
        });

        expect(resolveSelectedTermId(1, [sem2])).toBe(2);
    });

    it('recalculates against the new year terms after an academic-year switch', () => {
        const nextYearTerm1 = buildTerm({
            id: 11,
            academic_year: 2027,
            academic_year_name: '2027',
            name: '2027 Term 1',
            start_date: '2027-01-03',
            end_date: '2027-03-31',
        });
        const nextYearTerm2 = buildTerm({
            id: 12,
            academic_year: 2027,
            academic_year_name: '2027',
            name: '2027 Term 2',
            start_date: '2027-04-10',
            end_date: '2027-06-30',
        });

        expect(resolveSelectedTermId(2, [nextYearTerm2, nextYearTerm1])).toBe(11);
    });
});

describe('academic term calendar access', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-12T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('allows an admin to set up an active term with incomplete calendar setup', () => {
        const activeIncompleteTerm = buildTerm({
            id: 2,
            start_date: '2026-07-01',
            end_date: '2026-09-30',
            is_calendar_setup_complete: false,
        });

        expect(canEditTermCalendar({
            isAdminLike: true,
            term: activeIncompleteTerm,
        })).toBe(true);
        expect(canAddTermCalendarEvent({
            isAdminLike: true,
            term: activeIncompleteTerm,
        })).toBe(true);
        expect(canCompleteTermCalendar({
            isAdminLike: true,
            term: activeIncompleteTerm,
        })).toBe(true);
        expect(canReopenTermCalendar({
            isAdminLike: true,
            term: activeIncompleteTerm,
        })).toBe(false);
    });

    it('does not infer edit permission from term dates', () => {
        const serverOpenEndedTerm = buildTerm({
            id: 3,
            start_date: '2026-01-01',
            end_date: '2026-03-31',
            configuration_state: 'SETUP_OPEN',
            configuration_actions: {
                can_edit_term: true,
                can_delete_term: false,
                can_add_calendar_event: true,
                can_edit_calendar_event: true,
                can_delete_calendar_event: true,
                can_complete_setup: true,
                can_reopen_setup: false,
            },
        });

        expect(canEditTermCalendar({
            isAdminLike: true,
            term: serverOpenEndedTerm,
        })).toBe(true);
        expect(canEditTermCalendarEvent({
            isAdminLike: true,
            term: serverOpenEndedTerm,
        })).toBe(true);
    });

    it('keeps a historical selected term read-only', () => {
        const historicalTerm = buildTerm({
            id: 1,
            start_date: '2026-07-01',
            end_date: '2026-09-30',
            status: 'CLOSED_HISTORICAL',
            is_frozen: true,
            configuration_state: 'HISTORICAL_LOCKED',
            configuration_actions: {
                can_edit_term: false,
                can_delete_term: false,
                can_add_calendar_event: false,
                can_edit_calendar_event: false,
                can_delete_calendar_event: false,
                can_complete_setup: false,
                can_reopen_setup: false,
            },
            configuration_locked_reason: 'Historical terms are locked.',
        });

        expect(canEditTermCalendar({
            isAdminLike: true,
            term: historicalTerm,
        })).toBe(false);
        expect(canDeleteTermCalendarEvent({
            isAdminLike: true,
            term: historicalTerm,
        })).toBe(false);
        expect(canReopenTermCalendar({
            isAdminLike: true,
            term: historicalTerm,
        })).toBe(false);
    });

    it('wires setup actions and locked state to the shared calendar access predicates', () => {
        const termsPage = source('app/core/components/academic/terms/TermsPage.tsx');
        const helperSource = source('app/core/components/academic/terms/termSelection.ts');
        const canEditBlock = helperSource.slice(
            helperSource.indexOf('export function canEditTermCalendar'),
            helperSource.indexOf('export function canAddTermCalendarEvent'),
        );

        expect(termsPage).toContain('const calendarCanAddEvent = canAddTermCalendarEvent(calendarAccessContext);');
        expect(termsPage).toContain('const calendarCanEditEvent = canEditTermCalendarEvent(calendarAccessContext);');
        expect(termsPage).toContain('const calendarCanDeleteEvent = canDeleteTermCalendarEvent(calendarAccessContext);');
        expect(termsPage).toContain('const calendarCanComplete = canCompleteTermCalendar(calendarAccessContext);');
        expect(termsPage).toContain('const calendarReopenable = canReopenTermCalendar(calendarAccessContext);');
        expect(termsPage).toContain('const termDetailLocked = isTermDetailLocked(calendarAccessContext);');
        expect(termsPage).toContain('{calendarCanAddEvent ? (');
        expect(termsPage).toContain('{calendarCanComplete ? (');
        expect(termsPage).toContain('Add Calendar Event');
        expect(termsPage).toContain('Mark Setup Complete');
        expect(termsPage).toContain('{termDetailLocked ? (');
        expect(termsPage).toContain('Term configuration locked');
        expect(termsPage).toContain('Existing schemes may require review or regeneration.');
        expect(termsPage).toContain('TERM_CONFIGURATION_LOCKED');
        expect(termsPage).toContain('TERM_SETUP_REOPEN_NOT_ALLOWED');
        expect(canEditBlock).toContain('term.configuration_actions');
        expect(canEditBlock).not.toContain('isTermPast');
        expect(canEditBlock).not.toContain('is_calendar_setup_complete');
        expect(canEditBlock).not.toContain('term.actions');
    });
});

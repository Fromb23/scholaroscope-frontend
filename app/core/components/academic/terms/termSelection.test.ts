import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Term } from '@/app/core/types/academic';
import {
    canEditTermCalendar,
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
            isHistoricalView: false,
            term: activeIncompleteTerm,
        })).toBe(true);
        expect(canReopenTermCalendar({
            isAdminLike: true,
            isHistoricalView: false,
            term: activeIncompleteTerm,
        })).toBe(false);
    });

    it('keeps a historical selected term read-only', () => {
        const historicalTerm = buildTerm({
            id: 1,
            start_date: '2026-07-01',
            end_date: '2026-09-30',
            status: 'CLOSED_HISTORICAL',
            is_frozen: true,
        });

        expect(canEditTermCalendar({
            isAdminLike: true,
            isHistoricalView: false,
            term: historicalTerm,
        })).toBe(false);
        expect(canReopenTermCalendar({
            isAdminLike: true,
            isHistoricalView: false,
            term: historicalTerm,
        })).toBe(false);
    });

    it('wires setup actions and locked state to the shared calendar access predicates', () => {
        const termsPage = source('app/core/components/academic/terms/TermsPage.tsx');

        expect(termsPage).toContain('const calendarEditable = canEditTermCalendar(calendarAccessContext);');
        expect(termsPage).toContain('const calendarReopenable = canReopenTermCalendar(calendarAccessContext);');
        expect(termsPage).toContain('const termDetailLocked = isTermDetailLocked(calendarAccessContext);');
        expect(termsPage).toContain('{calendarEditable ? (');
        expect(termsPage).toContain('Add Calendar Event');
        expect(termsPage).toContain('Mark Setup Complete');
        expect(termsPage).toContain('{termDetailLocked ? (');
        expect(termsPage).toContain('Term record locked');
    });
});

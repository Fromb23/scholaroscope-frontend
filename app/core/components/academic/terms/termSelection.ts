import {
    isTermActive,
    isTermPast,
} from '@/app/core/components/academic/TermComponents';
import type { Term } from '@/app/core/types/academic';

interface TermCalendarAccessContext {
    isAdminLike: boolean;
    isHistoricalView: boolean;
    term: Term | null;
}

export function termHasHistoricalLifecycle(term: Term): boolean {
    return term.status === 'CLOSED_HISTORICAL' || term.is_frozen;
}

function isSelectableCurrentOrFutureTerm(term: Term): boolean {
    return !termHasHistoricalLifecycle(term) && !isTermPast(term);
}

export function resolveDefaultSelectedTerm(terms: Term[]): Term | null {
    if (!terms.length) {
        return null;
    }

    const active = terms.find((term) => (
        !termHasHistoricalLifecycle(term) && isTermActive(term)
    ));
    if (active) {
        return active;
    }

    const upcoming = [...terms]
        .filter(isSelectableCurrentOrFutureTerm)
        .sort((left, right) => (
            left.start_date.localeCompare(right.start_date)
            || left.end_date.localeCompare(right.end_date)
            || left.id - right.id
        ))[0];
    if (upcoming) {
        return upcoming;
    }

    const mostRecentlyEnded = [...terms]
        .filter(isTermPast)
        .sort((left, right) => (
            right.end_date.localeCompare(left.end_date)
            || right.start_date.localeCompare(left.start_date)
            || right.id - left.id
        ))[0];

    return mostRecentlyEnded ?? terms[0];
}

export function resolveSelectedTermId(
    currentSelectedTermId: number | null,
    terms: Term[],
): number | null {
    if (currentSelectedTermId && terms.some((term) => term.id === currentSelectedTermId)) {
        return currentSelectedTermId;
    }

    return resolveDefaultSelectedTerm(terms)?.id ?? null;
}

export function canEditTermCalendar({
    isAdminLike,
    isHistoricalView,
    term,
}: TermCalendarAccessContext): boolean {
    if (!isAdminLike || !term || isHistoricalView) return false;
    if (term.actions?.can_complete_setup === false) return false;
    if (term.actions?.can_complete_setup === true) return true;
    return Boolean(isSelectableCurrentOrFutureTerm(term) && !term.is_calendar_setup_complete);
}

export function canReopenTermCalendar({
    isAdminLike,
    isHistoricalView,
    term,
}: TermCalendarAccessContext): boolean {
    if (!isAdminLike || !term || isHistoricalView) return false;
    if (term.actions?.can_reopen_setup === false) return false;
    if (term.actions?.can_reopen_setup === true) return true;
    return Boolean(isSelectableCurrentOrFutureTerm(term) && term.is_calendar_setup_complete);
}

export function isTermDetailLocked(context: TermCalendarAccessContext): boolean {
    return Boolean(
        context.isAdminLike
        && context.term
        && !canEditTermCalendar(context)
    );
}

import {
    isTermActive,
    isTermPast,
} from '@/app/core/components/academic/TermComponents';
import type { Term } from '@/app/core/types/academic';

interface TermCalendarAccessContext {
    isAdminLike: boolean;
    term: Term | null;
}

export function termHasHistoricalLifecycle(term: Term): boolean {
    return (
        term.status === 'ENDED_GRACE_PERIOD'
        || term.status === 'CLOSING'
        || term.status === 'CLOSED_HISTORICAL'
        || term.is_frozen
        || isTermPast(term)
    );
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
    term,
}: TermCalendarAccessContext): boolean {
    if (!isAdminLike || !term) return false;
    if (termHasHistoricalLifecycle(term)) return false;
    const actions = term.configuration_actions;
    return Boolean(
        actions.can_add_calendar_event
        || actions.can_edit_calendar_event
        || actions.can_delete_calendar_event
        || actions.can_complete_setup
    );
}

export function canAddTermCalendarEvent({
    isAdminLike,
    term,
}: TermCalendarAccessContext): boolean {
    return Boolean(isAdminLike && term && !termHasHistoricalLifecycle(term) && term.configuration_actions.can_add_calendar_event);
}

export function canEditTermCalendarEvent({
    isAdminLike,
    term,
}: TermCalendarAccessContext): boolean {
    return Boolean(isAdminLike && term && !termHasHistoricalLifecycle(term) && term.configuration_actions.can_edit_calendar_event);
}

export function canDeleteTermCalendarEvent({
    isAdminLike,
    term,
}: TermCalendarAccessContext): boolean {
    return Boolean(isAdminLike && term && !termHasHistoricalLifecycle(term) && term.configuration_actions.can_delete_calendar_event);
}

export function canCompleteTermCalendar({
    isAdminLike,
    term,
}: TermCalendarAccessContext): boolean {
    return Boolean(isAdminLike && term && !termHasHistoricalLifecycle(term) && term.configuration_actions.can_complete_setup);
}

export function canReopenTermCalendar({
    isAdminLike,
    term,
}: TermCalendarAccessContext): boolean {
    return Boolean(isAdminLike && term && !termHasHistoricalLifecycle(term) && term.configuration_actions.can_reopen_setup);
}

export function isTermDetailLocked(context: TermCalendarAccessContext): boolean {
    return Boolean(
        context.isAdminLike
        && context.term
        && (termHasHistoricalLifecycle(context.term) || context.term.configuration_state !== 'SETUP_OPEN')
    );
}

import {
    isTermActive,
    isTermPast,
} from '@/app/core/components/academic/TermComponents';
import type { Term } from '@/app/core/types/academic';

interface TermCalendarAccessContext {
    canManageTerms: boolean;
    term: Term | null;
}

export interface WorkTermSelectionInput {
    requestedTermId?: number | null;
    terms: Term[];
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

export function resolveRequestedTermSelectionId(
    requestedTermId: number | null | undefined,
    terms: Term[],
): number | null {
    if (!requestedTermId) {
        return null;
    }

    return terms.some((term) => term.id === requestedTermId)
        ? requestedTermId
        : null;
}

export function resolveAvailableWorkTerms(terms: Term[]): Term[] {
    return terms;
}

function resolveCurrentWorkTerm(terms: Term[]): Term | null {
    return terms.find((term) => (
        !termHasHistoricalLifecycle(term) && isTermActive(term)
    )) ?? null;
}

export function resolveExplicitWorkTermId(
    requestedTermId: number | null | undefined,
    terms: Term[],
): number | null {
    if (!requestedTermId) {
        return null;
    }

    return terms.some((term) => term.id === requestedTermId)
        ? requestedTermId
        : null;
}

export function resolveWorkSelectedTermId({
    requestedTermId,
    terms,
}: WorkTermSelectionInput): number | null {
    return resolveExplicitWorkTermId(requestedTermId, terms)
        ?? resolveCurrentWorkTerm(terms)?.id
        ?? null;
}

export function canCreateWorkForTerm(term: Term | null): boolean {
    return Boolean(
        term
        && isTermActive(term)
        && !termHasHistoricalLifecycle(term)
        && term.status === 'OPEN'
        && term.configuration_state !== 'HISTORICAL_LOCKED'
        && !term.is_frozen
    );
}

export function formatWorkTermOptionLabel(term: Term): string {
    const lifecycleLabel = termHasHistoricalLifecycle(term)
        ? 'Ended'
        : isTermActive(term)
            ? 'Current'
            : 'Upcoming';

    return `${term.academic_year_name} - ${term.name} (${lifecycleLabel})`;
}

export function canEditTermCalendar({
    canManageTerms,
    term,
}: TermCalendarAccessContext): boolean {
    if (!canManageTerms || !term) return false;
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
    canManageTerms,
    term,
}: TermCalendarAccessContext): boolean {
    return Boolean(canManageTerms && term && !termHasHistoricalLifecycle(term) && term.configuration_actions.can_add_calendar_event);
}

export function canEditTermCalendarEvent({
    canManageTerms,
    term,
}: TermCalendarAccessContext): boolean {
    return Boolean(canManageTerms && term && !termHasHistoricalLifecycle(term) && term.configuration_actions.can_edit_calendar_event);
}

export function canDeleteTermCalendarEvent({
    canManageTerms,
    term,
}: TermCalendarAccessContext): boolean {
    return Boolean(canManageTerms && term && !termHasHistoricalLifecycle(term) && term.configuration_actions.can_delete_calendar_event);
}

export function canCompleteTermCalendar({
    canManageTerms,
    term,
}: TermCalendarAccessContext): boolean {
    return Boolean(canManageTerms && term && !termHasHistoricalLifecycle(term) && term.configuration_actions.can_complete_setup);
}

export function canReopenTermCalendar({
    canManageTerms,
    term,
}: TermCalendarAccessContext): boolean {
    return Boolean(canManageTerms && term && !termHasHistoricalLifecycle(term) && term.configuration_actions.can_reopen_setup);
}

export function isTermDetailLocked(context: TermCalendarAccessContext): boolean {
    return Boolean(
        context.canManageTerms
        && context.term
        && (termHasHistoricalLifecycle(context.term) || context.term.configuration_state !== 'SETUP_OPEN')
    );
}

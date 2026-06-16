import { isSafeNextPath } from '@/app/core/auth/navigation';

type SearchParamsLike =
    | URLSearchParams
    | { toString(): string }
    | string
    | null
    | undefined;

function toUrlSearchParams(searchParams: SearchParamsLike): URLSearchParams {
    if (!searchParams) {
        return new URLSearchParams();
    }

    if (typeof searchParams === 'string') {
        return new URLSearchParams(searchParams.startsWith('?') ? searchParams.slice(1) : searchParams);
    }

    return new URLSearchParams(searchParams.toString());
}

export function sanitizeInternalReturnTo(returnTo: string | null | undefined): string | null {
    return isSafeNextPath(returnTo) ? returnTo : null;
}

export function buildCbcPath(
    pathname: string,
    params?: {
        cohort?: number | string | null;
        subject?: number | string | null;
        returnTo?: string | null;
    },
): string {
    const searchParams = new URLSearchParams();

    if (params?.cohort) {
        searchParams.set('cohort', String(params.cohort));
    }
    if (params?.subject) {
        searchParams.set('subject', String(params.subject));
    }

    const safeReturnTo = sanitizeInternalReturnTo(params?.returnTo);
    if (safeReturnTo) {
        searchParams.set('returnTo', safeReturnTo);
    }

    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
}

export function buildCurrentCbcWorkspaceHref(
    pathname: string,
    searchParams: SearchParamsLike,
): string {
    const nextSearchParams = toUrlSearchParams(searchParams);
    const safeReturnTo = sanitizeInternalReturnTo(nextSearchParams.get('returnTo'));

    if (safeReturnTo) {
        nextSearchParams.set('returnTo', safeReturnTo);
    } else {
        nextSearchParams.delete('returnTo');
    }

    const query = nextSearchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
}

export function getCbcBackLabel(returnTo: string | null | undefined, fallbackLabel = 'Back'): string {
    const safeReturnTo = sanitizeInternalReturnTo(returnTo);
    if (!safeReturnTo) {
        return fallbackLabel;
    }

    if (/^\/academic\/cohorts\/\d+\/assignments(?:\/|$|\?)/.test(safeReturnTo)) {
        return 'Back to Assignments';
    }
    if (safeReturnTo.startsWith('/academic/cohorts/')) {
        return 'Back to Cohort';
    }
    if (safeReturnTo.startsWith('/cbc/browser')) {
        return 'Back to CBC Subjects & Outcomes';
    }
    if (safeReturnTo.startsWith('/cbc/progress')) {
        return 'Back to CBC Progress';
    }

    return fallbackLabel;
}

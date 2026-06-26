import { isSafeNextPath } from '@/app/core/auth/navigation';

export interface LearnerProfileBackTarget {
    href: string;
    label: string;
}

export interface LearnerProfileBackTargetParams {
    returnTo?: string | null;
    back?: string | null;
    isSelfManagedTeachingWorkspace?: boolean;
}

export function buildLearnersBackHref(back: string | null): string {
    if (!back) {
        return '/learners';
    }

    try {
        const decoded = decodeURIComponent(back);
        const params = new URLSearchParams(decoded);
        const normalized = params.toString();
        return normalized ? `/learners?${normalized}` : '/learners';
    } catch {
        return '/learners';
    }
}

export function getLearnerProfileBackTarget({
    returnTo,
    back,
    isSelfManagedTeachingWorkspace = false,
}: LearnerProfileBackTargetParams): LearnerProfileBackTarget {
    const safeReturnTo = isSafeNextPath(returnTo) ? returnTo : null;

    if (safeReturnTo) {
        if (safeReturnTo.startsWith('/academic/cohorts/') && safeReturnTo.includes('#subject-')) {
            return { href: safeReturnTo, label: 'Back to class subject' };
        }

        if (safeReturnTo.startsWith('/academic/cohorts')) {
            return { href: safeReturnTo, label: 'Back to class' };
        }

        if (safeReturnTo.startsWith('/learners')) {
            return { href: safeReturnTo, label: 'Back to Learners' };
        }

        return { href: safeReturnTo, label: 'Back' };
    }

    if (back) {
        return { href: buildLearnersBackHref(back), label: 'Back to Learners' };
    }

    if (isSelfManagedTeachingWorkspace) {
        return { href: '/academic/cohorts', label: 'Back to classes' };
    }

    return { href: '/learners', label: 'Back to Learners' };
}

export function buildLearnerProfileHref(learnerId: number, returnTo?: string | null): string {
    const safeReturnTo = isSafeNextPath(returnTo) ? returnTo : null;

    if (!safeReturnTo) {
        return `/learners/${learnerId}`;
    }

    return `/learners/${learnerId}?${new URLSearchParams({ returnTo: safeReturnTo }).toString()}`;
}

export function buildClassLearnerProfileHref(learnerId: number, cohortId: number): string {
    return buildLearnerProfileHref(learnerId, `/academic/cohorts/${cohortId}`);
}

export function buildClassSubjectLearnerProfileHref(
    learnerId: number,
    cohortId: number,
    cohortSubjectId: number,
): string {
    return buildLearnerProfileHref(learnerId, `/academic/cohorts/${cohortId}#subject-${cohortSubjectId}`);
}

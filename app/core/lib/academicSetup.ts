import type {
    AcademicSetupStatus,
    AcademicSetupStep,
    AcademicSetupStepKey,
} from '@/app/core/types/academic';

export const ACADEMIC_SETUP_STEP_ORDER: AcademicSetupStepKey[] = [
    'CURRICULUM',
    'ACADEMIC_YEAR',
    'TERMS',
    'SUBJECTS',
    'COHORTS',
];

// TODO: Extend backend AcademicSetupStatus so current-year CBC senior cohorts without
// `cbc_profile` or linked class subjects remain globally incomplete, not just on the cohort page.

const ACADEMIC_SETUP_OPERATIONAL_PATHS: RegExp[] = [
    /^\/learners(\/.*)?$/,
    /^\/sessions(\/.*)?$/,
    /^\/lesson-plans(\/.*)?$/,
    /^\/assessments(\/.*)?$/,
    /^\/reports(\/.*)?$/,
    /^\/schemes(\/.*)?$/,
    /^\/admin\/instructors(\/.*)?$/,
    /^\/admin\/alerts(\/.*)?$/,
    /^\/cbc(\/.*)?$/,
];

export type AcademicSetupPageState = 'current' | 'blocked' | 'completed' | 'done';

export function isAcademicSetupIncomplete(status: AcademicSetupStatus | null | undefined): boolean {
    return Boolean(status && !status.complete);
}

export function getAcademicSetupStep(
    status: AcademicSetupStatus | null | undefined,
    stepKey: AcademicSetupStepKey,
): AcademicSetupStep | null {
    return status?.steps.find((step) => step.key === stepKey) ?? null;
}

export function getAcademicSetupPageState(
    status: AcademicSetupStatus | null | undefined,
    stepKey: AcademicSetupStepKey,
): AcademicSetupPageState {
    if (!status || status.complete || !status.current_step) {
        return 'done';
    }

    const currentIndex = ACADEMIC_SETUP_STEP_ORDER.indexOf(status.current_step);
    const pageIndex = ACADEMIC_SETUP_STEP_ORDER.indexOf(stepKey);

    if (currentIndex < 0 || pageIndex < 0) {
        return 'done';
    }
    if (currentIndex === pageIndex) {
        return 'current';
    }
    if (currentIndex < pageIndex) {
        return 'blocked';
    }
    return 'completed';
}

export function isAcademicSetupOperationalAdminPath(path: string): boolean {
    return ACADEMIC_SETUP_OPERATIONAL_PATHS.some((pattern) => pattern.test(path));
}

export function buildAcademicSetupRedirectHref(
    status: AcademicSetupStatus,
    blockedPath?: string | null,
): string {
    const [basePath, existingQuery = ''] = status.next_action.href.split('?', 2);
    const params = new URLSearchParams(existingQuery);
    params.set('setup', '1');
    params.set('blocked', '1');
    if (blockedPath) {
        params.set('returnTo', blockedPath);
    }
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
}

export function withAcademicSetupMode(
    href: string,
    params?: Record<string, string | null | undefined>,
): string {
    const [basePath, existingQuery = ''] = href.split('?', 2);
    const searchParams = new URLSearchParams(existingQuery);
    searchParams.set('setup', '1');

    Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        } else {
            searchParams.delete(key);
        }
    });

    const query = searchParams.toString();
    return query ? `${basePath}?${query}` : basePath;
}

export function getAcademicSetupCurrentStepNavItem(
    status: AcademicSetupStatus | null | undefined,
): { label: string; href: string } | null {
    if (!status || status.complete || !status.current_step_label) {
        return null;
    }

    return {
        label: status.current_step_label,
        href: status.next_action.href,
    };
}

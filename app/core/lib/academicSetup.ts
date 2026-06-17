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
export type AcademicSetupOriginKind = 'generic' | 'cambridge';

export interface AcademicSetupOriginInput {
    setup?: string | null;
    blocked?: string | null;
    returnTo?: string | null;
    origin?: string | null;
    flow?: string | null;
    pluginKey?: string | null;
}

export interface AcademicSetupOriginContext {
    kind: AcademicSetupOriginKind;
    title: string;
    message: string;
    returnLabel: string;
}

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

function isCambridgeReturnTarget(returnTo?: string | null): boolean {
    return Boolean(returnTo?.startsWith('/cambridge') || returnTo?.startsWith('/admin/settings?tab=plugins&plugin=cambridge'));
}

function explicitlyRequestsCambridge(input: AcademicSetupOriginInput): boolean {
    const explicitValues = [input.origin, input.flow, input.pluginKey]
        .map((value) => value?.trim().toLowerCase())
        .filter(Boolean);
    return explicitValues.some((value) => value === 'cambridge');
}

export function resolveAcademicSetupOrigin(
    input: AcademicSetupOriginInput,
): AcademicSetupOriginContext {
    if (explicitlyRequestsCambridge(input) && isCambridgeReturnTarget(input.returnTo)) {
        return {
            kind: 'cambridge',
            title: 'Cambridge Setup Flow',
            message: 'Create the curriculum here, then return to the Cambridge offering to assign cohorts.',
            returnLabel: 'Return to Cambridge offering',
        };
    }

    return {
        kind: 'generic',
        title: 'Complete curriculum setup to continue.',
        message: 'After setup, return to the page you were working on.',
        returnLabel: 'Return to previous page',
    };
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

import type { InstalledPlugin } from '@/app/core/types/plugins';
import { isCambridgeCurriculum, isCambridgeCurriculumType } from '@/app/core/lib/curriculumBridge';

export type PolicySurfaceKey = 'generic' | 'cbc' | 'cambridge';

export interface PolicySurfaceDefinition {
    key: PolicySurfaceKey;
    label: string;
    description: string;
    href: string;
    owner: 'kernel' | 'plugin';
    pluginKey?: string;
}

type CurriculumLike = {
    name?: string | null;
    curriculum_type?: string | null;
    is_active?: boolean;
};

type PluginLike = Pick<InstalledPlugin, 'key' | 'state' | 'is_active'> | string;

const CBC_CURRICULUM_TYPES = new Set<string>(['CBC', 'CBE']);
const GENERIC_POLICY_CURRICULUM_TYPES = new Set<string>([
    '8-4-4',
    'CAMBRIDGE',
    'CAM_PRIMARY',
    'CAM_LOWER_SEC',
    'CAM_UPPER_SEC',
    'CAM_ADVANCED',
]);

const CAMBRIDGE_PLUGIN_POLICY_ROUTE: string | null = null;

export const POLICY_SURFACE_DEFINITIONS: Record<PolicySurfaceKey, PolicySurfaceDefinition> = {
    generic: {
        key: 'generic',
        label: 'Generic Grade Policies',
        description: 'Kernel-owned grading policies for generic-compatible reporting flows.',
        href: '/reports/grade-policies',
        owner: 'kernel',
    },
    cbc: {
        key: 'cbc',
        label: 'CBC Academic Policies',
        description: 'Academic report policies used by the CBC report engine.',
        href: '/reports/policies/cbc',
        owner: 'plugin',
        pluginKey: 'cbc',
    },
    cambridge: {
        key: 'cambridge',
        label: 'Cambridge Policies',
        description: 'Cambridge-owned report policy module.',
        href: CAMBRIDGE_PLUGIN_POLICY_ROUTE ?? '/reports/policies',
        owner: 'plugin',
        pluginKey: 'cambridge',
    },
};

function normalizeCurriculumType(curriculumType?: string | null): string {
    return (curriculumType ?? '').trim().toUpperCase();
}

function normalizeName(name?: string | null): string {
    return (name ?? '').trim().toUpperCase();
}

function hasActivePlugin(installedPlugins: PluginLike[] | undefined, pluginKey: string): boolean {
    if (!installedPlugins?.length) return false;

    return installedPlugins.some((plugin) => {
        if (typeof plugin === 'string') {
            return plugin === pluginKey;
        }

        return plugin.key === pluginKey && (plugin.state === 'active' || plugin.is_active);
    });
}

export function isCbcCurriculumType(curriculumType?: string | null): boolean {
    return CBC_CURRICULUM_TYPES.has(normalizeCurriculumType(curriculumType));
}

export function isCbcCurriculum(curriculum?: CurriculumLike | null): boolean {
    if (!curriculum) return false;

    return (
        isCbcCurriculumType(curriculum.curriculum_type) ||
        /(?:^|\b)(cbc|cbe)(?:\b|[\s(-])/i.test(curriculum.name ?? '')
    );
}

export function isGenericPolicyCurriculum(curriculum?: CurriculumLike | null): boolean {
    if (!curriculum || isCbcCurriculum(curriculum)) return false;

    return GENERIC_POLICY_CURRICULUM_TYPES.has(normalizeCurriculumType(curriculum.curriculum_type));
}

export function getPolicySurfaceForCurriculum(
    curriculum?: CurriculumLike | null,
    installedPlugins?: PluginLike[],
): PolicySurfaceDefinition | null {
    if (!curriculum) return null;

    if (isCbcCurriculum(curriculum)) {
        return hasActivePlugin(installedPlugins, 'cbc')
            ? POLICY_SURFACE_DEFINITIONS.cbc
            : null;
    }

    if (isGenericPolicyCurriculum(curriculum)) {
        return POLICY_SURFACE_DEFINITIONS.generic;
    }

    if (isCambridgeCurriculum(curriculum) && CAMBRIDGE_PLUGIN_POLICY_ROUTE && hasActivePlugin(installedPlugins, 'cambridge')) {
        return POLICY_SURFACE_DEFINITIONS.cambridge;
    }

    return null;
}

export function getPolicySurfaceForCurriculumType(
    curriculumType?: string | null,
    installedPlugins?: PluginLike[],
): PolicySurfaceDefinition | null {
    const normalizedType = normalizeCurriculumType(curriculumType);

    return getPolicySurfaceForCurriculum(
        {
            name: normalizeName(curriculumType),
            curriculum_type: normalizedType,
        },
        installedPlugins,
    );
}

export function getAvailablePolicySurfaces({
    curricula,
    installedPlugins,
}: {
    curricula: CurriculumLike[];
    installedPlugins?: PluginLike[];
}): PolicySurfaceDefinition[] {
    const activeCurricula = curricula.filter((curriculum) => curriculum.is_active !== false);
    const surfaces = new Map<PolicySurfaceKey, PolicySurfaceDefinition>();

    activeCurricula.forEach((curriculum) => {
        const surface = getPolicySurfaceForCurriculum(curriculum, installedPlugins);
        if (surface) {
            surfaces.set(surface.key, surface);
            return;
        }

        if (
            isCambridgeCurriculumType(curriculum.curriculum_type) &&
            CAMBRIDGE_PLUGIN_POLICY_ROUTE &&
            hasActivePlugin(installedPlugins, 'cambridge')
        ) {
            surfaces.set('cambridge', POLICY_SURFACE_DEFINITIONS.cambridge);
        }
    });

    return Array.from(surfaces.values()).sort((left, right) => {
        const order: PolicySurfaceKey[] = ['generic', 'cbc', 'cambridge'];
        return order.indexOf(left.key) - order.indexOf(right.key);
    });
}

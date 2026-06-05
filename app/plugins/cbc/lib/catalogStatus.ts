import type {
    CBCCatalogContentStatus,
    CBCCatalogRegistrationStatus,
} from '@/app/plugins/cbc/types/cbc';

export type CBCCatalogBadgeKind =
    | 'FULLY_REGISTERED'
    | 'PARTIALLY_REGISTERED'
    | 'CATALOGUE_ONLY'
    | 'CONTENT_MISSING';

export interface CBCCatalogStatusBadge {
    kind: CBCCatalogBadgeKind;
    label: string;
    className: string;
}

interface CatalogStatusSource {
    registration_status?: CBCCatalogRegistrationStatus | null;
    content_status?: CBCCatalogContentStatus | null;
    any_registered: boolean;
    all_registered: boolean;
    total_sub_strands_count?: number | null;
}

const BADGES: Record<CBCCatalogBadgeKind, CBCCatalogStatusBadge> = {
    FULLY_REGISTERED: {
        kind: 'FULLY_REGISTERED',
        label: 'All registered',
        className:
            'text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full',
    },
    PARTIALLY_REGISTERED: {
        kind: 'PARTIALLY_REGISTERED',
        label: 'Partial',
        className:
            'text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full',
    },
    CATALOGUE_ONLY: {
        kind: 'CATALOGUE_ONLY',
        label: 'Catalogue only',
        className:
            'text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full',
    },
    CONTENT_MISSING: {
        kind: 'CONTENT_MISSING',
        label: 'Curriculum design missing',
        className:
            'text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full',
    },
};

function badge(kind: CBCCatalogBadgeKind | null) {
    return kind ? BADGES[kind] : null;
}

export function resolveCBCCatalogBadgeKind({
    registration_status,
    content_status,
    any_registered,
    all_registered,
    total_sub_strands_count,
}: CatalogStatusSource): CBCCatalogBadgeKind | null {
    const totalSubStrandsCount = total_sub_strands_count ?? 0;

    switch (registration_status) {
        case 'FULLY_REGISTERED':
            return totalSubStrandsCount > 0 ? 'FULLY_REGISTERED' : null;
        case 'PARTIALLY_REGISTERED':
            return totalSubStrandsCount > 0 ? 'PARTIALLY_REGISTERED' : null;
        case 'CATALOGUE_ONLY':
            return 'CATALOGUE_ONLY';
        case 'CONTENT_MISSING':
            return 'CONTENT_MISSING';
        case 'NOT_REGISTERED':
            return null;
        default:
            break;
    }

    if (totalSubStrandsCount === 0) {
        if (content_status === 'CATALOGUE_ONLY') {
            return 'CATALOGUE_ONLY';
        }
        if (content_status === 'CONTENT_MISSING' || content_status === 'PARTIAL') {
            return 'CONTENT_MISSING';
        }
        return null;
    }

    if (all_registered) {
        return 'FULLY_REGISTERED';
    }
    if (any_registered) {
        return 'PARTIALLY_REGISTERED';
    }
    return null;
}

export function resolveCBCCatalogBadge(source: CatalogStatusSource) {
    return badge(resolveCBCCatalogBadgeKind(source));
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    CAMBRIDGE_BRIDGE_NAME,
    isCambridgeCurriculum,
    isCambridgeCurriculumType,
} from '@/app/core/lib/curriculumBridge';
import { CURRICULUM_TYPE_OPTIONS } from '@/app/core/types/academic';
import type { Curriculum, CurriculumType } from '@/app/core/types/academic';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import { useCambridgeOffering } from '@/app/plugins/cambridge/hooks';

interface SearchParamsLike {
    get: (key: string) => string | null;
}

interface UseCambridgeCohortQuickActionArgs {
    searchParams: SearchParamsLike;
    curricula: Curriculum[];
    selectedCurriculumId?: number;
    shouldOpenCreate: boolean;
    createCurriculum: (payload: {
        name: string;
        curriculum_type: CurriculumType;
        description: string;
        is_active: boolean;
    }) => Promise<Curriculum>;
    updateFilters: (updates: { curriculum?: string }) => void;
}

function parseOptionalNumber(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getLegacyOfferingId(returnTo: string | null): number | null {
    if (!returnTo) return null;
    const match = returnTo.match(/\/cambridge\/offerings\/(\d+)\/cohorts/);
    return match ? Number(match[1]) : null;
}

export function useCambridgeCohortQuickAction({
    searchParams,
    curricula,
    selectedCurriculumId,
    shouldOpenCreate,
    createCurriculum,
    updateFilters,
}: UseCambridgeCohortQuickActionArgs) {
    const [error, setError] = useState<string | null>(null);
    const [isProvisioningCurriculum, setIsProvisioningCurriculum] = useState(false);

    const returnTo = searchParams.get('returnTo');
    const source = searchParams.get('source');
    const explicitOfferingId = parseOptionalNumber(searchParams.get('offering'));
    const curriculumTypeParam = searchParams.get('curriculum_type');
    const isCambridgeQuickAction = source === 'cambridge' || Boolean(returnTo?.startsWith('/cambridge/'));
    const offeringId = explicitOfferingId ?? getLegacyOfferingId(returnTo);
    const quickActionCurriculumType = isCambridgeCurriculumType(curriculumTypeParam)
        ? curriculumTypeParam as CurriculumType
        : null;
    const { data: offering, isLoading: offeringLoading } = useCambridgeOffering(
        isCambridgeQuickAction && !quickActionCurriculumType ? offeringId : null
    );
    const resolvedCurriculumType = quickActionCurriculumType
        ?? (offering?.programme_code as CurriculumType | undefined)
        ?? null;

    const curriculum = useMemo(() => {
        if (selectedCurriculumId) {
            return curricula.find((entry) => entry.id === selectedCurriculumId) ?? null;
        }
        if (isCambridgeQuickAction) {
            return curricula.find((entry) => entry.is_active && isCambridgeCurriculum(entry)) ?? null;
        }
        if (!resolvedCurriculumType) {
            return null;
        }

        return curricula.find(
            (entry) => entry.is_active && entry.curriculum_type === resolvedCurriculumType
        ) ?? null;
    }, [curricula, isCambridgeQuickAction, resolvedCurriculumType, selectedCurriculumId]);

    const curriculumName = useMemo(() => {
        if (isCambridgeQuickAction || !resolvedCurriculumType) {
            return CAMBRIDGE_BRIDGE_NAME;
        }

        return CURRICULUM_TYPE_OPTIONS.find(
            (option) => option.value === resolvedCurriculumType
        )?.label ?? resolvedCurriculumType;
    }, [isCambridgeQuickAction, resolvedCurriculumType]);

    useEffect(() => {
        if (isCambridgeQuickAction && curriculum && selectedCurriculumId !== curriculum.id) {
            updateFilters({ curriculum: String(curriculum.id) });
        }
    }, [curriculum, isCambridgeQuickAction, selectedCurriculumId, updateFilters]);

    useEffect(() => {
        const shouldProvision =
            isCambridgeQuickAction
            && shouldOpenCreate
            && !selectedCurriculumId
            && !curriculum
            && !isProvisioningCurriculum
            && Boolean(resolvedCurriculumType)
            && !offeringLoading;

        if (!shouldProvision) {
            return;
        }

        let cancelled = false;

        const provisionCurriculum = async () => {
            setIsProvisioningCurriculum(true);
            setError(null);
            try {
                const createdCurriculum = await createCurriculum({
                    name: curriculumName,
                    curriculum_type: resolvedCurriculumType as CurriculumType,
                    description: '',
                    is_active: true,
                });
                if (!cancelled) {
                    updateFilters({ curriculum: String(createdCurriculum.id) });
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        extractErrorMessage(
                            err as ApiError,
                            'Failed to prepare the Cambridge curriculum for cohort creation.'
                        )
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsProvisioningCurriculum(false);
                }
            }
        };

        void provisionCurriculum();

        return () => {
            cancelled = true;
        };
    }, [
        createCurriculum,
        curriculum,
        curriculumName,
        isCambridgeQuickAction,
        isProvisioningCurriculum,
        offeringLoading,
        resolvedCurriculumType,
        selectedCurriculumId,
        shouldOpenCreate,
        updateFilters,
    ]);

    const setupPending = isCambridgeQuickAction && (
        offeringLoading
        || isProvisioningCurriculum
        || (!curriculum && Boolean(resolvedCurriculumType))
    );

    return {
        isActive: isCambridgeQuickAction,
        returnTo,
        curriculum,
        setupPending,
        error,
        clearError: () => setError(null),
        noticeTitle: 'Cambridge Setup Flow',
        noticeDescription: 'Create the cohort. The matching Cambridge curriculum will be used automatically, then return to the offering assignment.',
        pendingMessage: 'Preparing the Cambridge curriculum for this cohort...',
        returnLabel: 'Return to Cambridge offering',
    };
}

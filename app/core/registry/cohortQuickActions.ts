'use client';

import type { Curriculum, CurriculumType } from '@/app/core/types/academic';

interface SearchParamsLike {
    get: (key: string) => string | null;
}

export interface CohortQuickActionArgs {
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

export interface CohortQuickActionState {
    isActive: boolean;
    returnTo: string | null;
    curriculum: Curriculum | null;
    setupPending: boolean;
    error: string | null;
    clearError: () => void;
    noticeTitle: string;
    noticeDescription: string;
    pendingMessage: string;
    returnLabel: string;
}

const emptyQuickAction: CohortQuickActionState = {
    isActive: false,
    returnTo: null,
    curriculum: null,
    setupPending: false,
    error: null,
    clearError: () => {},
    noticeTitle: '',
    noticeDescription: '',
    pendingMessage: '',
    returnLabel: '',
};

type CohortQuickActionHook = (args: CohortQuickActionArgs) => CohortQuickActionState;

const _hooks: CohortQuickActionHook[] = [];

export function registerCohortQuickActionHook(hook: CohortQuickActionHook): void {
    if (_hooks.includes(hook)) return;
    _hooks.push(hook);
}

export function useRegisteredCohortQuickAction(args: CohortQuickActionArgs): CohortQuickActionState {
    const actions = _hooks.map((hook) => hook(args));
    return actions.find((action) => action.isActive) ?? emptyQuickAction;
}

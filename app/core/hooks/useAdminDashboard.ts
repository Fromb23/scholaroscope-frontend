'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { dashboardAPI } from '@/app/core/api/dashboards';
import { dashboardKeys } from '@/app/core/lib/queryKeys';
import type { ApiError } from '@/app/core/types/errors';
import { resolveErrorMessage } from '@/app/core/types/errors';

export type AlertType = 'error' | 'warning' | 'info' | 'success';

export interface DashboardAlert {
    id: number;
    type: AlertType;
    message: string;
    action: string;
    link: string;
}

export interface DashboardMetrics {
    students: { total: number; active: number };
    attendance: { todayRate: number };
    assessments: {
        total: number;
        pending: number;
        upcoming: number;
        needsGrading: number;
        completed: number;
    };
    sessions: { today: number; upcoming: number };
    performance: { averageScore: number; needsSupport: number };
}

export interface DashboardAcademicContext {
    key: string;
    curriculumName: string;
    termName: string;
    yearName: string;
}

export interface DashboardAttentionItem {
    id: string;
    label: string;
    detail: string;
    href: string;
}

export interface DashboardWeekIndicator {
    id: string;
    label: string;
    numerator: number;
    denominator: number;
}

const EMPTY_METRICS: DashboardMetrics = {
    students: { total: 0, active: 0 },
    attendance: { todayRate: 0 },
    assessments: { total: 0, pending: 0, upcoming: 0, needsGrading: 0, completed: 0 },
    sessions: { today: 0, upcoming: 0 },
    performance: { averageScore: 0, needsSupport: 0 },
};

export function useAdminDashboard() {
    const { user, activeOrg, activeOperatingContext, workspaceGeneration } = useAuth();
    const [lastRefresh, setLastRefresh] = useState(() => new Date());
    const query = useQuery({
        queryKey: dashboardKeys.workspaceAdmin(
            activeOrg?.id ?? null,
            user?.id ?? null,
            workspaceGeneration,
        ),
        queryFn: async () => {
            try {
                return await dashboardAPI.getWorkspaceAdmin();
            } catch (error) {
                throw new Error(resolveErrorMessage(
                    error as ApiError,
                    'Could not load the workspace dashboard.',
                ));
            }
        },
        enabled: Boolean(
            user
            && activeOrg
            && activeOperatingContext === 'WORKSPACE_MANAGEMENT'
        ),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
        refetchInterval: () => (
            typeof document === 'undefined' || document.visibilityState === 'visible'
                ? 5 * 60_000
                : false
        ),
    });

    useEffect(() => {
        if (!query.data?.generated_at) return;
        const generatedAt = new Date(query.data.generated_at);
        if (!Number.isNaN(generatedAt.getTime())) setLastRefresh(generatedAt);
    }, [query.data?.generated_at]);

    const refetch = query.refetch;
    const refresh = useCallback(async () => {
        await refetch();
        setLastRefresh(new Date());
    }, [refetch]);

    return {
        metrics: query.data?.metrics ?? EMPTY_METRICS,
        alerts: query.data?.alerts ?? [],
        sessions: query.data?.sessions ?? [],
        cohorts: query.data?.cohorts ?? [],
        currentTerm: query.data?.current_term ?? null,
        currentYear: query.data?.current_year ?? null,
        academicContexts: query.data?.academic_contexts ?? [],
        attentionItems: query.data?.attention_items ?? [],
        weekIndicators: query.data?.week_indicators ?? [],
        upcomingAssessments: query.data?.upcoming_assessments ?? [],
        unattendedSubjects: query.data?.unattended_subjects ?? [],
        lastRefresh,
        isLoading: query.isLoading,
        error: query.error?.message ?? null,
        refresh,
    };
}

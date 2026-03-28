// ============================================================================
// app/core/api/platformHealth.ts
// Mirrors: PlatformHealthViewSet GET /api/platform-health/
// ============================================================================

import { apiClient } from './client';

export type SignalSeverity = 'OK' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type OverallSeverity = 'OK' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OrphanUser {
    id: number;
    email: string;
    full_name: string;
    date_joined: string;
    last_login: string | null;
}

export interface SuspendedOrg {
    id: number;
    name: string;
    suspension_reason: string | null;
    affected_users: number;
    suspended_since: string;
}

export interface GracePeriodPlugin {
    id: number;
    plugin: string;
    organization: string;
    data_retention_until: string;
}

export interface PendingRequest {
    id: number;
    request_type: string;
    organization__name: string;
    created_at: string;
}

export interface HealthSignal<T> {
    count: number;
    severity: SignalSeverity;
    items?: T[];
    breakdown?: Record<string, number>;
}

export interface PlatformHealthResponse {
    overall_severity: OverallSeverity;
    signals: {
        orphan_users: HealthSignal<OrphanUser>;
        suspended_orgs: HealthSignal<SuspendedOrg>;
        stale_summaries: HealthSignal<never> & { breakdown: { grade_summaries: number; attendance_summaries: number } };
        plugins_in_grace_period: HealthSignal<GracePeriodPlugin>;
        pending_tier2_requests: HealthSignal<PendingRequest>;
    };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const platformHealthAPI = {
    getHealth: async (): Promise<PlatformHealthResponse> => {
        const response = await apiClient.get<PlatformHealthResponse>('/platform-health/');
        return response.data;
    },
};
// ============================================================================
// app/plugins/platform/audit/types/auditLogs.ts
// ============================================================================

export type AuditAction =
    | 'CREATE' | 'UPDATE' | 'DELETE'
    | 'LOGIN' | 'LOGOUT'
    | 'ACTIVATE' | 'DEACTIVATE'
    | 'ASSIGN' | 'UNASSIGN'
    | 'SUSPEND' | 'UNSUSPEND';

export type AuditResource =
    | 'USER' | 'ORGANIZATION' | 'MEMBERSHIP'
    | 'COHORT' | 'SUBJECT' | 'ACADEMIC_YEAR'
    | 'TERM' | 'ASSESSMENT' | 'SESSION'
    | 'PLUGIN' | 'REQUEST';

export interface AuditLog {
    id: number;
    actor: number | null;
    actor_email: string;
    actor_name: string;
    actor_role: string;
    organization: number | null;
    organization_name: string;
    action: AuditAction;
    resource_type: AuditResource;
    resource_id: number | null;
    resource_name: string;
    details: Record<string, unknown>;
    ip_address: string | null;
    timestamp: string;
}

export interface AuditLogFilters {
    search?: string;
    action?: string;
    resource_type?: string;
    organization?: number;
    date_from?: string;
    date_to?: string;
}

export interface AuditStats {
    total: number;
    today: number;
    last_7_days: number;
    by_action: Record<string, number>;
    by_resource: Record<string, number>;
}

export const ACTION_COLORS: Record<AuditAction, 'success' | 'info' | 'danger' | 'warning' | 'default'> = {
    CREATE: 'success',
    UPDATE: 'info',
    DELETE: 'danger',
    LOGIN: 'default',
    LOGOUT: 'default',
    ACTIVATE: 'success',
    DEACTIVATE: 'warning',
    ASSIGN: 'info',
    UNASSIGN: 'warning',
    SUSPEND: 'danger',
    UNSUSPEND: 'success',
};
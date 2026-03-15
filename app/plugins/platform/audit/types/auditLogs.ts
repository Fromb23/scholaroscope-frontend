// ============================================================================
// app/types/auditLogs.ts
// Ready for when backend implements audit logging
// ============================================================================

export type AuditAction =
    | 'CREATE' | 'UPDATE' | 'DELETE'
    | 'LOGIN' | 'LOGOUT'
    | 'ACTIVATE' | 'DEACTIVATE'
    | 'ASSIGN' | 'UNASSIGN';

export type AuditResource =
    | 'USER' | 'ORGANIZATION' | 'COHORT' | 'SUBJECT'
    | 'ACADEMIC_YEAR' | 'TERM' | 'ASSESSMENT' | 'SESSION';

export interface AuditLog {
    id: number;
    actor_id: number;
    actor_email: string;
    actor_name: string;
    actor_role: string;
    organization_id: number | null;
    organization_name: string | null;
    action: AuditAction;
    resource_type: AuditResource;
    resource_id: number | null;
    resource_name: string;
    details: Record<string, any>;
    ip_address: string;
    timestamp: string;
}

export interface AuditLogFilters {
    search?: string;
    action?: string;
    resource_type?: string;
    organization_id?: number;
    date_from?: string;
    date_to?: string;
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
};
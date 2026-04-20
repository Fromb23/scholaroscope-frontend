// ============================================================================
// app/plugins/platform/audit/types/auditLogs.ts
// Re-exports shared audit types from core; keeps plugin-specific filter type.
// ============================================================================

export type { AuditAction, AuditResource, AuditLog, AuditStats } from '@/app/core/types/audit';
export { ACTION_COLORS } from '@/app/core/types/audit';

export interface AuditLogFilters {
    search?: string;
    action?: string;
    resource_type?: string;
    organization?: number;
    date_from?: string;
    date_to?: string;
}
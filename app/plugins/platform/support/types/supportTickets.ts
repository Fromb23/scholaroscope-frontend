// ============================================================================
// app/types/supportTickets.ts
// Ready for when backend implements support ticket endpoint
// ============================================================================

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketCategory =
    | 'BILLING' | 'TECHNICAL' | 'ACCESS' | 'FEATURE_REQUEST' | 'BUG' | 'OTHER';

export interface TicketMessage {
    id: number;
    author_name: string;
    author_role: string;
    content: string;
    is_internal: boolean;       // internal note vs public reply
    created_at: string;
}

export interface SupportTicket {
    id: number;
    ticket_ref: string;         // e.g. TKT-0042
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    organization_id: number;
    organization_name: string;
    submitted_by_name: string;
    submitted_by_email: string;
    assigned_to: string | null;
    messages: TicketMessage[];
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
}

export const STATUS_COLORS: Record<TicketStatus, 'warning' | 'info' | 'success' | 'default'> = {
    OPEN: 'warning',
    IN_PROGRESS: 'info',
    RESOLVED: 'success',
    CLOSED: 'default',
};

export const PRIORITY_COLORS: Record<TicketPriority, 'default' | 'info' | 'warning' | 'danger'> = {
    LOW: 'default',
    MEDIUM: 'info',
    HIGH: 'warning',
    CRITICAL: 'danger',
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
    BILLING: 'Billing',
    TECHNICAL: 'Technical',
    ACCESS: 'Access',
    FEATURE_REQUEST: 'Feature Request',
    BUG: 'Bug Report',
    OTHER: 'Other',
};
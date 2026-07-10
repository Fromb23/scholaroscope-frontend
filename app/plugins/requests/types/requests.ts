// ============================================================================
// app/types/requests.ts
// Mirrors apps/requests/models.py exactly
// ============================================================================

// ── Enums ────────────────────────────────────────────────────────────────────

export type RequestStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CLOSED';
export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type ApprovalExecutionPolicy =
    | 'AUTO_ON_APPROVAL'
    | 'MANUAL_AFTER_APPROVAL'
    | 'UNLOCK_ACTION'
    | 'RECORD_ONLY'
    | 'EXTERNAL_SUPPORT';
export type ApprovalExecutionStatus =
    | 'NOT_REQUIRED'
    | 'PENDING'
    | 'EXECUTED'
    | 'FAILED'
    | 'MANUAL_REQUIRED'
    | 'SKIPPED';

// Instructor → Admin
export type InstructorRequestType =
    | 'ENROLLMENT_CHANGE'
    | 'GRADE_OVERRIDE'
    | 'STUDENT_STATUS_UPDATE'
    | 'SESSION_RESCHEDULE'
    | 'RESOURCE_REQUEST'
    | 'ACCOUNT_DELETION'   // NEW: instructor requests own account erasure
    | 'OTHER';

// Admin -> Scholaroscope support
export type AdminRequestType =
    | 'PLAN_UPGRADE'
    | 'ORG_SETTINGS_CHANGE'
    | 'USER_LIMIT_INCREASE'
    | 'BUG_REPORT'
    | 'FEATURE_REQUEST'
    | 'SUSPEND_RESTORE_USER'
    | 'ORG_DELETION'
    | 'OTHER';

export type RequestType = InstructorRequestType | AdminRequestType;
export type ApprovalActionKey = RequestType;
export type RequestReferenceData = Record<string, string | number | boolean | object | null | undefined>;

// ── Models ────────────────────────────────────────────────────────────────────

export interface RequestComment {
    id: number;
    author_name: string;
    author_role: string;
    content: string;
    is_internal: boolean;
    created_at: string;
}

export interface Request {
    id: number;
    title: string;
    description: string;
    request_type: RequestType;
    request_type_display: string;
    action_key: ApprovalActionKey;
    category: string;
    category_display: string;
    status: RequestStatus;
    status_display: string;
    priority: RequestPriority;
    priority_display: string;
    execution_policy: ApprovalExecutionPolicy;
    execution_policy_display: string;
    execution_status: ApprovalExecutionStatus;
    execution_status_display: string;
    execution_error: string;
    execution_attempted_at: string | null;
    execution_completed_at: string | null;
    submitted_by_name: string;
    submitted_by_email: string;
    submitted_by_role: string;
    reviewed_by_name: string | null;
    organization: number;
    organization_name: string;
    resolution_note: string;
    reviewed_at: string | null;
    origin_route: string;
    return_to: string;
    target_type: string;
    target_id: string;
    request_key: string;
    idempotency_key: string;
    reference_data: RequestReferenceData;
    comment_count: number;
    created_at: string;
    updated_at: string;
    duplicate?: boolean;
    detail?: string;
}

export interface RequestDetail extends Request {
    comments: RequestComment[];
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface RequestCreatePayload {
    title: string;
    description: string;
    request_type: RequestType;
    action_key?: ApprovalActionKey;
    priority: RequestPriority;
    reference_data?: RequestReferenceData;
    origin_route?: string;
    return_to?: string;
    target_type?: string;
    target_id?: string | number;
    request_key?: string;
    idempotency_key?: string;
}

export interface RequestReviewPayload {
    action: 'approve' | 'reject' | 'review';
    resolution_note?: string;
}

export interface AddCommentPayload {
    content: string;
    is_internal: boolean;
}

export interface RequestStats {
    total: number;
    pending: number;
    in_review: number;
    approved: number;
    rejected: number;
    cancelled?: number;
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<RequestStatus, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
    PENDING: 'warning',
    IN_REVIEW: 'info',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'default',
    CLOSED: 'default',
};

export const PRIORITY_COLORS: Record<RequestPriority, 'default' | 'info' | 'warning' | 'danger'> = {
    LOW: 'default',
    NORMAL: 'info',
    HIGH: 'warning',
    URGENT: 'danger',
};

export const INSTRUCTOR_REQUEST_OPTIONS: { value: InstructorRequestType; label: string }[] = [
    { value: 'ENROLLMENT_CHANGE', label: 'Enrollment Change' },
    { value: 'GRADE_OVERRIDE', label: 'Grade Override' },
    { value: 'STUDENT_STATUS_UPDATE', label: 'Student Status Update' },
    { value: 'SESSION_RESCHEDULE', label: 'Session Cancellation / Reschedule' },
    { value: 'RESOURCE_REQUEST', label: 'Resource Request' },
    { value: 'ACCOUNT_DELETION', label: 'Account Deletion Request' },  // NEW
    { value: 'OTHER', label: 'Other' },
];

export const ADMIN_REQUEST_OPTIONS: { value: AdminRequestType; label: string }[] = [
    { value: 'PLAN_UPGRADE', label: 'Plan Upgrade / Downgrade' },
    { value: 'ORG_SETTINGS_CHANGE', label: 'Organization Settings Change' },
    { value: 'USER_LIMIT_INCREASE', label: 'User Limit Increase' },
    { value: 'BUG_REPORT', label: 'Bug Report / Technical Issue' },
    { value: 'FEATURE_REQUEST', label: 'Feature Request' },
    { value: 'SUSPEND_RESTORE_USER', label: 'Suspend / Restore User' },
    { value: 'ORG_DELETION', label: 'Organization Deletion Request' },  // NEW
    { value: 'OTHER', label: 'Other' },
];

import { apiClient } from '@/app/core/api/client';

export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type ApprovalActionKey =
    | 'ENROLLMENT_CHANGE'
    | 'GRADE_OVERRIDE'
    | 'STUDENT_STATUS_UPDATE'
    | 'SESSION_RESCHEDULE'
    | 'RESOURCE_REQUEST'
    | 'ACCOUNT_DELETION'
    | 'PLAN_UPGRADE'
    | 'ORG_SETTINGS_CHANGE'
    | 'USER_LIMIT_INCREASE'
    | 'BUG_REPORT'
    | 'FEATURE_REQUEST'
    | 'SUSPEND_RESTORE_USER'
    | 'ORG_DELETION'
    | 'OTHER';
export type RequestReferenceData = Record<string, string | number | boolean | object | null | undefined>;

export interface ApprovalRequest {
    id: number;
    status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CLOSED';
    status_display: string;
    execution_status: 'NOT_REQUIRED' | 'PENDING' | 'EXECUTED' | 'FAILED' | 'MANUAL_REQUIRED' | 'SKIPPED';
    execution_status_display: string;
    execution_error: string;
    resolution_note: string;
    duplicate?: boolean;
}

export interface ApprovalIntentInput {
    actionKey: ApprovalActionKey;
    title: string;
    targetType?: string;
    targetId?: string | number | null;
    originRoute?: string;
    returnTo?: string;
    referenceData?: RequestReferenceData;
    requestKey?: string;
    description?: string;
}

export interface ApprovalIntentSubmission {
    reason: string;
    priority: RequestPriority;
    note?: string;
}

export function buildApprovalIntent(
    intent: ApprovalIntentInput,
    submission: ApprovalIntentSubmission,
) {
    const reason = submission.reason.trim();
    const note = submission.note?.trim();
    const description = [
        intent.description?.trim(),
        reason ? `Reason: ${reason}` : '',
        note ? `Note: ${note}` : '',
    ].filter(Boolean).join('\n\n');

    return {
        title: intent.title,
        description,
        request_type: intent.actionKey,
        action_key: intent.actionKey,
        priority: submission.priority,
        reference_data: {
            ...(intent.referenceData ?? {}),
            reason,
            note: note || undefined,
        },
        origin_route: intent.originRoute,
        return_to: intent.returnTo ?? intent.originRoute,
        target_type: intent.targetType,
        target_id: intent.targetId ?? undefined,
        request_key: intent.requestKey,
        idempotency_key: intent.requestKey,
    };
}

export async function submitApprovalIntent(
    intent: ApprovalIntentInput,
    submission: ApprovalIntentSubmission,
): Promise<ApprovalRequest> {
    const response = await apiClient.post<ApprovalRequest>(
        '/requests/',
        buildApprovalIntent(intent, submission),
    );
    return response.data;
}

export function getCurrentApprovalRoute(): string {
    if (typeof window === 'undefined') {
        return '';
    }
    return `${window.location.pathname}${window.location.search}`;
}

export function buildContextualRequestKey(parts: Array<string | number | null | undefined>): string {
    return parts
        .filter((part) => part !== null && part !== undefined && String(part).trim() !== '')
        .map((part) => String(part).trim().replace(/\s+/g, '-'))
        .join(':');
}

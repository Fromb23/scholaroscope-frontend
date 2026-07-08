'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Send, XCircle } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import {
    getCurrentApprovalRoute,
    type ApprovalIntentInput,
    type ApprovalRequest,
    type RequestPriority,
} from '@/app/core/lib/approvalIntents';
import { useApprovalIntent } from '@/app/core/hooks/useApprovalIntent';

const PRIORITY_OPTIONS: Array<{ value: RequestPriority; label: string }> = [
    { value: 'LOW', label: 'Low' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
];

const STATUS_COLORS: Record<ApprovalRequest['status'], 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
    PENDING: 'warning',
    IN_REVIEW: 'info',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'default',
    CLOSED: 'default',
};

export function ApprovalRequestStatusBadge({ request }: { request?: ApprovalRequest | null }) {
    if (!request) return null;

    return (
        <span className="inline-flex items-center gap-2">
            <Badge variant={STATUS_COLORS[request.status]} size="sm">
                {request.status_display}
            </Badge>
            {request.execution_status === 'FAILED' ? (
                <Badge variant="danger" size="sm">Execution failed</Badge>
            ) : null}
            {request.duplicate ? (
                <Badge variant="info" size="sm">Existing request</Badge>
            ) : null}
        </span>
    );
}

export function ApprovalRequestFeedbackCard({ request }: { request?: ApprovalRequest | null }) {
    if (!request) return null;

    const isRejected = request.status === 'REJECTED';
    const isApproved = request.status === 'APPROVED';
    const isFailed = request.execution_status === 'FAILED';

    return (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
            isFailed || isRejected
                ? 'border-red-200 bg-red-50 text-red-800'
                : isApproved
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800'
        }`}>
            <div className="flex items-start gap-2">
                {isFailed || isRejected ? (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : isApproved ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                    <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div className="min-w-0">
                    <p className="font-medium">
                        Request #{request.id} {request.duplicate ? 'is already pending' : 'submitted'}
                    </p>
                    <div className="mt-1">
                        <ApprovalRequestStatusBadge request={request} />
                    </div>
                    {request.execution_error ? (
                        <p className="mt-2 break-words">{request.execution_error}</p>
                    ) : request.resolution_note ? (
                        <p className="mt-2 break-words">{request.resolution_note}</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export function ApprovalIntentModal({
    isOpen,
    intent,
    submitting,
    error,
    onClose,
    onSubmit,
}: {
    isOpen: boolean;
    intent: ApprovalIntentInput | null;
    submitting: boolean;
    error?: string | null;
    onClose: () => void;
    onSubmit: (payload: { reason: string; priority: RequestPriority; note?: string }) => Promise<ApprovalRequest | null>;
}) {
    const [reason, setReason] = useState('');
    const [priority, setPriority] = useState<RequestPriority>('NORMAL');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setReason('');
            setPriority('NORMAL');
            setNote('');
        }
    }, [isOpen]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!reason.trim()) return;
        await onSubmit({ reason, priority, note });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={intent?.title ?? 'Request Approval'} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
                    <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        rows={4}
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                    <select
                        value={priority}
                        onChange={(event) => setPriority(event.target.value as RequestPriority)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {PRIORITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Optional note</label>
                    <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {error ? (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={submitting || !reason.trim()}>
                        <Send className="h-4 w-4" />
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function ContextualApprovalRequestButton({
    intent,
    children,
    variant = 'secondary',
    size = 'sm',
    className = '',
    disabled = false,
    onSubmitted,
}: {
    intent: ApprovalIntentInput;
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    disabled?: boolean;
    onSubmitted?: (request: ApprovalRequest) => void;
}) {
    const approvalIntent = useApprovalIntent();
    const [feedbackRequest, setFeedbackRequest] = useState<ApprovalRequest | null>(null);

    const open = () => {
        const currentRoute = getCurrentApprovalRoute();
        approvalIntent.openIntent({
            ...intent,
            originRoute: intent.originRoute || currentRoute,
            returnTo: intent.returnTo || currentRoute,
        });
    };

    return (
        <div className="space-y-2">
            <Button
                type="button"
                variant={variant}
                size={size}
                className={className}
                disabled={disabled}
                onClick={open}
            >
                {children}
            </Button>
            <ApprovalRequestFeedbackCard request={feedbackRequest ?? approvalIntent.submittedRequest} />
            <ApprovalIntentModal
                isOpen={approvalIntent.isOpen}
                intent={approvalIntent.intent}
                submitting={approvalIntent.submitting}
                error={approvalIntent.error}
                onClose={approvalIntent.closeIntent}
                onSubmit={async (payload) => {
                    const request = await approvalIntent.submitIntent(payload);
                    if (request) {
                        setFeedbackRequest(request);
                        onSubmitted?.(request);
                    }
                    return request;
                }}
            />
        </div>
    );
}

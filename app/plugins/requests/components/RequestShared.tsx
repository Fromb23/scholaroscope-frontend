'use client';
// ============================================================================
// app/components/requests/RequestShared.tsx
// Shared components reused across all 4 request pages
// ============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Clock, CheckCircle2, XCircle, Eye, Trash2, MessageCircle,
    ChevronRight, FileText, Flame, ArrowUp, Minus, ArrowDown,
    Send, StickyNote, AlertTriangle, CheckCircle, Building2,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import Modal from '@/app/components/ui/Modal';
import {
    Request, RequestStatus, RequestPriority,
    RequestDetail, RequestComment,
    STATUS_COLORS, PRIORITY_COLORS,
} from '@/app/plugins/requests/types/requests';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export function PriorityIcon({ priority }: { priority: RequestPriority }) {
    const cls = 'h-3.5 w-3.5';
    if (priority === 'URGENT') return <Flame className={`${cls} text-red-500`} />;
    if (priority === 'HIGH') return <ArrowUp className={`${cls} text-orange-500`} />;
    if (priority === 'NORMAL') return <Minus className={`${cls} text-blue-500`} />;
    return <ArrowDown className={`${cls} text-gray-400`} />;
}

// ── Stats Bar ────────────────────────────────────────────────────────────────

export function RequestStatsBar({ requests }: { requests: Request[] }) {
    const pending = requests.filter(r => r.status === 'PENDING').length;
    const inReview = requests.filter(r => r.status === 'IN_REVIEW').length;
    const approved = requests.filter(r => r.status === 'APPROVED').length;
    const rejected = requests.filter(r => r.status === 'REJECTED').length;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
                { label: 'Pending', value: pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                { label: 'In Review', value: inReview, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Approved', value: approved, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Rejected', value: rejected, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(s => (
                <div key={s.label} className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm`}>
                    <p className="text-xs font-medium text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
            ))}
        </div>
    );
}

// ── Request Card (list item) ──────────────────────────────────────────────────

export function RequestCard({
    request, onView, onDelete, showOrg = false,
}: {
    request: Request;
    onView: (r: Request) => void;
    onDelete?: (r: Request) => void;
    showOrg?: boolean;
}) {
    const canDelete = onDelete && request.status === 'PENDING';

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <PriorityIcon priority={request.priority} />
                        <Badge variant={STATUS_COLORS[request.status]} size="sm">
                            {request.status_display}
                        </Badge>
                        <Badge variant={PRIORITY_COLORS[request.priority]} size="sm">
                            {request.priority_display}
                        </Badge>
                        <span className="text-xs text-gray-400 font-mono">#{request.id}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {request.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{request.description}</p>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {request.request_type_display}
                        </span>
                        {showOrg && (
                            <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {request.organization_name}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(request.created_at)}
                        </span>
                        {request.comment_count > 0 && (
                            <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {request.comment_count}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={() => onView(request)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="View details"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    {canDelete && (
                        <button
                            onClick={() => onDelete!(request)}
                            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Delete request"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Resolution note */}
            {request.resolution_note && (
                <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${request.status === 'APPROVED'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    <span className="font-semibold">Note: </span>{request.resolution_note}
                </div>
            )}
        </div>
    );
}

// ── Request Detail Panel ──────────────────────────────────────────────────────

export function RequestDetailPanel({
    request,
    onClose,
    onReview,
    onAddComment,
    canReview,
    reviewerRole,
}: {
    request: RequestDetail;
    onClose: () => void;
    onReview?: (action: 'approve' | 'reject' | 'review', note: string) => Promise<void>;
    onAddComment: (content: string, is_internal: boolean) => Promise<void>;
    canReview: boolean;
    reviewerRole: string;
}) {
    const [comment, setComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewing, setReviewing] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [localRequest, setLocalRequest] = useState(request);

    const isPending = ['PENDING', 'IN_REVIEW'].includes(localRequest.status);

    const handleReview = async (action: 'approve' | 'reject' | 'review') => {
        if (!onReview) return;
        setReviewing(true);
        try {
            await onReview(action, reviewNote);
            setReviewNote('');
        } finally {
            setReviewing(false);
        }
    };

    const handleComment = async () => {
        if (!comment.trim()) return;
        setSubmittingComment(true);
        try {
            await onAddComment(comment, isInternal);
            setComment('');
        } finally {
            setSubmittingComment(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <PriorityIcon priority={localRequest.priority} />
                            <Badge variant={STATUS_COLORS[localRequest.status]} size="sm">
                                {localRequest.status_display}
                            </Badge>
                            <Badge variant={PRIORITY_COLORS[localRequest.priority]} size="sm">
                                {localRequest.priority_display}
                            </Badge>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {localRequest.request_type_display}
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">{localRequest.title}</h2>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
                            <span>By <strong>{localRequest.submitted_by_name}</strong></span>
                            <span>·</span>
                            <span>{timeAgo(localRequest.created_at)}</span>
                            {localRequest.organization_name && (
                                <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {localRequest.organization_name}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg leading-none"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Description */}
            <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-1.5">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{localRequest.description}</p>
                {localRequest.resolution_note && (
                    <div className={`mt-3 text-sm px-4 py-3 rounded-lg ${localRequest.status === 'APPROVED'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        <span className="font-semibold">Resolution: </span>{localRequest.resolution_note}
                    </div>
                )}
            </div>

            {/* Review Actions — only for admin/superadmin on open requests */}
            {canReview && isPending && (
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Review this Request</p>
                    <textarea
                        value={reviewNote}
                        onChange={e => setReviewNote(e.target.value)}
                        placeholder="Optional resolution note (shown to submitter on approve/reject)..."
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    />
                    <div className="flex gap-2">
                        {localRequest.status === 'PENDING' && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleReview('review')}
                                disabled={reviewing}
                                className="gap-1.5 text-blue-700 hover:bg-blue-50"
                            >
                                <Eye className="h-3.5 w-3.5" /> Mark In Review
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleReview('approve')}
                            disabled={reviewing}
                            className="gap-1.5 bg-green-600 hover:bg-green-700 focus:ring-green-500"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReview('reject')}
                            disabled={reviewing}
                            className="gap-1.5"
                        >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                    </div>
                </div>
            )}

            {/* Comments */}
            <div className="px-6 py-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                    Comments {localRequest.comments.length > 0 && `(${localRequest.comments.length})`}
                </p>
                <div className="space-y-3 max-h-56 overflow-y-auto mb-4">
                    {localRequest.comments.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
                    ) : (
                        localRequest.comments.map(c => (
                            <div key={c.id} className={`flex gap-3 ${c.is_internal ? 'opacity-90' : ''}`}>
                                <div className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${c.author_role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-700' :
                                    c.author_role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {c.author_name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-semibold text-gray-900">{c.author_name}</span>
                                        <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                                        {c.is_internal && (
                                            <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                <StickyNote className="h-2.5 w-2.5" /> Internal
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-sm rounded-lg px-3 py-2 ${c.is_internal ? 'bg-yellow-50 border border-yellow-200 text-yellow-900' :
                                        c.author_role !== 'INSTRUCTOR' ? 'bg-blue-50 text-blue-900' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                        {c.content}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Reply box */}
                <div>
                    {reviewerRole !== 'INSTRUCTOR' && (
                        <div className="flex gap-2 mb-2">
                            {['Public Reply', 'Internal Note'].map((label, i) => (
                                <button key={label}
                                    onClick={() => setIsInternal(i === 1)}
                                    className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${isInternal === (i === 1)
                                        ? i === 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                                        : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {i === 1 && <StickyNote className="h-3 w-3 inline mr-1" />}
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Add a comment..."
                            rows={2}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${isInternal ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'
                                }`}
                        />
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleComment}
                            disabled={!comment.trim() || submittingComment}
                            className="self-end"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

export function DeleteRequestModal({
    isOpen, onClose, onConfirm, title, submitting,
}: {
    isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void>;
    title: string; submitting: boolean;
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Request" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">
                        Delete <strong>"{title}"</strong>? This cannot be undone.
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={submitting}>
                        {submitting ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export { STATUS_COLORS, PRIORITY_COLORS };

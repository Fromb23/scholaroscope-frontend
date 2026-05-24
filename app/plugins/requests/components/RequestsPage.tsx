'use client';
// ============================================================================
// app/(dashboard)/requests/page.tsx
// Shared by ADMIN and INSTRUCTOR — same page, role-aware content
// ADMIN: sees instructor→admin requests in their org + button to submit to SuperAdmin
// INSTRUCTOR: sees only their own requests + button to submit to Admin
// ============================================================================

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Inbox, AlertTriangle, Send } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { useRequests } from '@/app/plugins/requests/hooks/useRequests';
import { Request } from '@/app/plugins/requests/types/requests';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import {
    RequestStatsBar, RequestCard, DeleteRequestModal,
} from '@/app/plugins/requests/components/RequestShared';

function getErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : 'Request action failed';
}

export function RequestsPage() {
    const router = useRouter();
    const { activeRole } = useAuth();
    const { requests, loading, error, refetch, deleteRequest } = useRequests();

    const isAdmin = activeRole === 'ADMIN';
    const isInstructor = activeRole === 'INSTRUCTOR';

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Request | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // Filtered list
    const filtered = useMemo(() => {
        return requests.filter(r => {
            const matchSearch = !search ||
                r.title.toLowerCase().includes(search.toLowerCase()) ||
                r.request_type_display.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all' || r.status === statusFilter;
            const matchType = typeFilter === 'all' || r.request_type === typeFilter;
            return matchSearch && matchStatus && matchType;
        });
    }, [requests, search, statusFilter, typeFilter]);

    // Unique types for filter dropdown
    const uniqueTypes = useMemo(() =>
        [...new Map(requests.map(r => [r.request_type, r.request_type_display])).entries()],
        [requests]
    );
    const pendingCount = useMemo(
        () => requests.filter((request) => ['PENDING', 'IN_REVIEW'].includes(request.status)).length,
        [requests]
    );
    const resolvedCount = useMemo(
        () => requests.filter((request) => ['APPROVED', 'REJECTED', 'CLOSED'].includes(request.status)).length,
        [requests]
    );
    const reviewableRequest = useMemo(
        () => (
            isAdmin
                ? filtered.find((request) => request.submitted_by_role === 'INSTRUCTOR')
                : null
        ),
        [filtered, isAdmin]
    );
    const assistantContext = useMemo(() => ({
        pageKey: 'requests_overview',
        pageTitle: isAdmin ? 'Pending Requests' : 'My Requests',
        state: {
            is_loading: loading,
            is_empty: !loading && filtered.length === 0,
            pending_count: pendingCount,
            resolved_count: resolvedCount,
            can_submit_request: isInstructor || isAdmin,
            can_review_request: Boolean(reviewableRequest),
        },
        visibleActions: [
            ...(isInstructor || isAdmin
                ? [{ label: 'Submit Request', type: 'navigate' as const, href: '/requests/new' }]
                : []),
            ...(filtered[0]
                ? [{ label: 'View Request', type: 'navigate' as const, href: `/requests/${filtered[0].id}` }]
                : []),
            ...(reviewableRequest
                ? [{ label: 'Review Request', type: 'navigate' as const, href: `/requests/${reviewableRequest.id}` }]
                : []),
        ],
        nextSafeAction: reviewableRequest
            ? { label: 'Review Request', type: 'navigate' as const, href: `/requests/${reviewableRequest.id}` }
            : (isInstructor || isAdmin
                ? { label: 'Submit Request', type: 'navigate' as const, href: '/requests/new' }
                : undefined),
        workflowStep: pendingCount > 0 ? 'review_requests' : 'submit_request',
        emptyStateReason: !loading && filtered.length === 0
            ? 'No requests are visible with the current filters.'
            : undefined,
    }), [
        filtered,
        isAdmin,
        isInstructor,
        loading,
        pendingCount,
        resolvedCount,
        reviewableRequest,
    ]);

    useAssistantPageContext(assistantContext);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            await deleteRequest(deleteTarget.id);
            setDeleteTarget(null);
            if (selectedId === deleteTarget.id) setSelectedId(null);
        } catch (err: unknown) { setActionError(getErrorMessage(err)); }
        finally { setSubmitting(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">{error}</p>
                <Button variant="secondary" onClick={refetch} className="mt-3">Try Again</Button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isAdmin ? 'Pending Requests' : 'My Requests'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isAdmin
                            ? 'Review and manage requests submitted by your instructors'
                            : 'Track your submitted requests and their approval status'
                        }
                    </p>
                </div>

                {/* Role-specific action buttons */}
                <div className="flex items-center gap-3">
                    {isInstructor && (
                        <Button
                            variant="primary"
                            onClick={() => router.push('/requests/new')}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" /> New Request
                        </Button>
                    )}

                    {isAdmin && (
                        <Button
                            variant="primary"
                            onClick={() => router.push('/requests/new')}
                            className="gap-2 bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
                        >
                            <Send className="h-4 w-4" /> Request to SuperAdmin
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <RequestStatsBar requests={requests} />

            {/* Error banner */}
            {actionError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {actionError}
                    <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
            )}

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text" placeholder="Search requests..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                    {uniqueTypes.length > 0 && (
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">All Types</option>
                            {uniqueTypes.map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    )}
                </div>
            </Card>

            {/* Split: list + detail */}
            <div className={`flex gap-5 items-start`}>
                <div className={`space-y-3 ${selectedId ? 'w-96 flex-shrink-0' : 'w-full'}`}>
                    {filtered.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-500">
                                {search || statusFilter !== 'all' ? 'No requests match your filters' :
                                    isInstructor ? "You haven't submitted any requests yet" : 'No requests yet'}
                            </p>
                            {isInstructor && !search && statusFilter === 'all' && (
                                <button
                                    onClick={() => router.push('/requests/new')}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Submit your first request →
                                </button>
                            )}
                        </div>
                    ) : (
                        filtered.map(r => (
                            <RequestCard
                                key={r.id} request={r}
                                onView={r => router.push(`/requests/${r.id}`)}
                                onDelete={isInstructor ? r => setDeleteTarget(r) : undefined}
                            />
                        ))
                    )}
                    {filtered.length > 0 && (
                        <p className="text-xs text-gray-500 pl-1">
                            {filtered.length} of {requests.length} request{requests.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                {/* Detail panel - REMOVED, now uses dedicated page */}
            </div>

            <DeleteRequestModal
                isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete} title={deleteTarget?.title ?? ''} submitting={submitting}
            />
        </div>
    );
}

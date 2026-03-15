'use client';
// ============================================================================
// app/(dashboard)/superadmin/support/page.tsx
// SuperAdmin sees ONLY Admin→SuperAdmin requests (backend scopes this automatically)
// ============================================================================

import { useState, useMemo } from 'react';
import { MessageCircle, Search, AlertTriangle } from 'lucide-react';
import { useRequests, useRequestDetail } from '@/app/plugins/requests/hooks/useRequests';
import { Request, STATUS_COLORS, PRIORITY_COLORS } from '@/app/plugins/requests/types/requests';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import {
    RequestStatsBar, RequestCard, RequestDetailPanel,
} from '@/app/plugins/requests/components/RequestShared';

export default function SuperAdminSupportPage() {
    const { requests, loading, error, refetch, reviewRequest } = useRequests();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const { request: selectedDetail, loading: detailLoading, addComment, reviewRequest: reviewDetail } =
        useRequestDetail(selectedId);

    const filtered = useMemo(() => {
        return requests.filter(r => {
            const matchSearch = !search ||
                r.title.toLowerCase().includes(search.toLowerCase()) ||
                r.organization_name.toLowerCase().includes(search.toLowerCase()) ||
                r.submitted_by_name.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all' || r.status === statusFilter;
            const matchType = typeFilter === 'all' || r.request_type === typeFilter;
            return matchSearch && matchStatus && matchType;
        });
    }, [requests, search, statusFilter, typeFilter]);

    const uniqueTypes = useMemo(() =>
        [...new Map(requests.map(r => [r.request_type, r.request_type_display])).entries()],
        [requests]
    );

    const handleReview = async (action: 'approve' | 'reject' | 'review', note: string) => {
        setActionError(null);
        try {
            await reviewDetail({ action, resolution_note: note });
            await refetch();
        } catch (err: any) { setActionError(err.message); }
    };

    const handleAddComment = async (content: string, is_internal: boolean) => {
        try { await addComment(content, is_internal); }
        catch (err: any) { setActionError(err.message); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto" />
                <p className="mt-3 text-sm text-gray-500">Loading requests...</p>
            </div>
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
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Support Requests</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Requests submitted by organization admins — {requests.length} total
                </p>
            </div>

            {/* Stats */}
            <RequestStatsBar requests={requests} />

            {/* Error */}
            {actionError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {actionError}
                    <button onClick={() => setActionError(null)} className="ml-auto text-red-400">✕</button>
                </div>
            )}

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text" placeholder="Search by title, organization or admin name..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="all">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                    {uniqueTypes.length > 0 && (
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option value="all">All Types</option>
                            {uniqueTypes.map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    )}
                </div>
            </Card>

            {/* Split panel */}
            <div className="flex gap-5 items-start">
                <div className={`space-y-3 ${selectedId ? 'w-96 flex-shrink-0' : 'w-full'}`}>
                    {filtered.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">
                                {search || statusFilter !== 'all' ? 'No requests match your filters' : 'No requests yet'}
                            </p>
                        </div>
                    ) : (
                        filtered.map(r => (
                            <RequestCard
                                key={r.id} request={r}
                                onView={r => setSelectedId(r.id)}
                                showOrg
                            />
                        ))
                    )}
                    {filtered.length > 0 && (
                        <p className="text-xs text-gray-500 pl-1">
                            {filtered.length} of {requests.length} request{requests.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                {selectedId && (
                    <div className="flex-1 min-w-0">
                        {detailLoading ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent mx-auto" />
                            </div>
                        ) : selectedDetail ? (
                            <RequestDetailPanel
                                request={selectedDetail}
                                onClose={() => setSelectedId(null)}
                                onReview={handleReview}
                                onAddComment={handleAddComment}
                                canReview
                                reviewerRole="SUPERADMIN"
                            />
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
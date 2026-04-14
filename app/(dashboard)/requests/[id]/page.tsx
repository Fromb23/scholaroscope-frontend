'use client';
// ============================================================================
// app/(dashboard)/requests/[id]/page.tsx
// Shared detail page for INSTRUCTOR, ADMIN, SUPERADMIN
// Role determines what actions are available
// ============================================================================

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useRequestDetail } from '@/app/plugins/requests/hooks/useRequests';
import { Button } from '@/app/components/ui/Button';
import { RequestDetailPanel } from '@/app/plugins/requests/components/RequestShared';

export default function RequestDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user, activeRole } = useAuth();
    const id = Number(params.id);

    const { request, loading, error, addComment, reviewRequest } = useRequestDetail(id);

    const isAdmin = activeRole === 'ADMIN';
    const isSuperAdmin = !!user?.is_superadmin;
    const canReview = isSuperAdmin
        ? request?.submitted_by_role === 'ADMIN'
        : isAdmin
            ? request?.submitted_by_role === 'INSTRUCTOR'
            : false;

    const handleReview = async (action: 'approve' | 'reject' | 'review', note: string) => {
        await reviewRequest({ action, resolution_note: note });
    };

    const handleAddComment = async (content: string, is_internal: boolean) => {
        await addComment(content, is_internal);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
    );

    if (error || !request) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">{error || 'Request not found'}</p>
                <Button variant="secondary" onClick={() => router.back()} className="mt-3">Go Back</Button>
            </div>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Requests
            </button>

            <RequestDetailPanel
                request={request}
                onClose={() => router.back()}
                onReview={canReview ? handleReview : undefined}
                onAddComment={handleAddComment}
                canReview={canReview}
                reviewerRole={activeRole ?? ''}
            />
        </div>
    );
}
'use client';

import { PendingApprovals } from '@/app/core/components/dashboard/AdminDashboardWidgets';
import { useRequests, useRequestStats } from '@/app/plugins/requests/hooks/useRequests';

export function AdminPendingApprovalsWidget() {
    const { requests, loading } = useRequests({ status: 'PENDING' });
    const { stats } = useRequestStats();

    return (
        <PendingApprovals
            requests={requests}
            loading={loading}
            pendingCount={stats?.pending ?? 0}
        />
    );
}

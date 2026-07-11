'use client';

import { RequestsPage } from '@/app/plugins/requests/components/RequestsPage';
import { InternalRequestsNotApplicable } from '@/app/plugins/requests/components/InternalRequestsNotApplicable';
import { useAuth } from '@/app/context/AuthContext';
import { supportsInternalRequests } from '@/app/core/lib/workspaceGovernance';

export default function Page() {
    const { capabilities } = useAuth();
    if (!supportsInternalRequests(capabilities)) {
        return <InternalRequestsNotApplicable />;
    }
    return <RequestsPage />;
}

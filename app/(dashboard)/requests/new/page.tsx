'use client';

import { NewRequestPage } from '@/app/plugins/requests/components/NewRequestPage';
import { InternalRequestsNotApplicable } from '@/app/plugins/requests/components/InternalRequestsNotApplicable';
import { useAuth } from '@/app/context/AuthContext';
import { supportsInternalRequests } from '@/app/core/lib/workspaceGovernance';

export default function Page() {
    const { capabilities } = useAuth();
    if (!supportsInternalRequests(capabilities)) {
        return <InternalRequestsNotApplicable />;
    }
    return <NewRequestPage />;
}

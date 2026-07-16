'use client';

import { useSearchParams } from 'next/navigation';
import { CbcReportPoliciesPage } from '@/app/plugins/cbc/components/reportPolicies/CbcReportPoliciesPage';
import { parseAppDestination } from '@/app/core/auth/navigation';

function positiveNumberParam(value: string | null): number | null {
    const parsed = Number(value ?? '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function CbcReportPoliciesRouteClient() {
    const searchParams = useSearchParams();
    const returnTo = parseAppDestination(searchParams.get('returnTo'));
    const selectedTermId = positiveNumberParam(searchParams.get('term'));

    return (
        <CbcReportPoliciesPage
            title="CBC Academic Policies"
            description="Report governance for CBC class subjects and terms."
            returnTo={returnTo}
            selectedTermId={selectedTermId}
            backLabel={returnTo?.startsWith('/reports/compute') ? 'Back to Compute' : 'Back'}
        />
    );
}

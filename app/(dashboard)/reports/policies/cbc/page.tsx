'use client';

import { useSearchParams } from 'next/navigation';
import { CbcReportPoliciesPage } from '@/app/plugins/cbc/components/reportPolicies/CbcReportPoliciesPage';

function safeReturnTo(value: string | null): string | null {
    if (!value) return null;
    if (!value.startsWith('/')) return null;
    if (value.startsWith('//')) return null;
    return value;
}

export default function Page() {
    const searchParams = useSearchParams();
    const returnTo = safeReturnTo(searchParams.get('returnTo'));

    return (
        <CbcReportPoliciesPage
            title="CBC Academic Policies"
            description="Report governance for CBC class subjects and terms."
            returnTo={returnTo}
            backLabel={returnTo?.startsWith('/reports/compute') ? 'Back to Compute' : 'Back'}
        />
    );
}

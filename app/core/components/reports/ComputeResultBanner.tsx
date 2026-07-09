'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import type { ComputeResult } from '@/app/core/hooks/reports/useComputePage';

export function ComputeResultBanner({ result }: { result: ComputeResult }) {
    const policyRequired = result.serverCode === 'policy_required';

    return (
        <div
            className={`mt-3 rounded-lg border p-2.5 text-sm ${
                result.success
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
            }`}
        >
            <div className="flex items-start gap-2">
                {result.success ? (
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div>
                    {result.title ? <p className="font-medium">{result.title}</p> : null}
                    <p>{result.message}</p>
                </div>
            </div>
            {policyRequired ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/reports/policies">
                        <Button type="button" variant="secondary" size="sm">Create policy</Button>
                    </Link>
                    <Link href="/reports/policies">
                        <Button type="button" variant="secondary" size="sm">Reuse previous term policy</Button>
                    </Link>
                    <Link href="/reports/policies">
                        <Button type="button" variant="secondary" size="sm">Open term report setup</Button>
                    </Link>
                </div>
            ) : null}
        </div>
    );
}

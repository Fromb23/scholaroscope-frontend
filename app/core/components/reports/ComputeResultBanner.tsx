'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';
import type { ComputeResult } from '@/app/core/hooks/reports/useComputePage';

export function ComputeResultBanner({ result }: { result: ComputeResult }) {
    return (
        <div
            className={`mt-3 flex items-center gap-2 rounded-lg border p-2.5 text-sm ${
                result.success
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
            }`}
        >
            {result.success ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {result.message}
        </div>
    );
}

'use client';

import type { CbcDistributionByCode } from '@/app/core/types/reporting';
import { CBC_CODE_ORDER } from '@/app/core/lib/reportingPresentation';

interface CbcCodeDistributionProps {
  distribution: CbcDistributionByCode | Record<string, number> | null | undefined;
}

export function CbcCodeDistribution({
  distribution,
}: CbcCodeDistributionProps) {
  const safeDistribution = distribution ?? {};
  const maxValue = Math.max(...CBC_CODE_ORDER.map((code) => safeDistribution[code] ?? 0), 1);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {CBC_CODE_ORDER.map((code) => {
          const count = safeDistribution[code] ?? 0;
          return (
            <div key={code} className="rounded-lg border border-gray-200 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-900">{code}</span>
                <span className="text-sm text-gray-600">{count}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-green-500"
                  style={{ width: `${(count / maxValue) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

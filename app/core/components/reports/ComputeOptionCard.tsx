'use client';

import { Loader, Play } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ComputeResultBanner } from '@/app/core/components/reports/ComputeResultBanner';
import type { ComputeOption, ComputeResult } from '@/app/core/hooks/reports/useComputePage';

interface ComputeOptionCardProps {
    option: ComputeOption;
    result?: ComputeResult;
    disabled: boolean;
    computing: boolean;
    onCompute: () => void;
}

export function ComputeOptionCard({
    option,
    result,
    disabled,
    computing,
    onCompute,
}: ComputeOptionCardProps) {
    return (
        <Card>
            <div className="mb-3 flex items-start justify-between">
                <div>
                    <p className="font-medium text-gray-900">{option.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{option.description}</p>
                </div>
            </div>
            <Button
                onClick={onCompute}
                disabled={disabled}
                variant="secondary"
                size="sm"
                className="w-full"
            >
                {computing ? (
                    <>
                        <Loader className="mr-1.5 h-3 w-3 animate-spin" />
                        Computing…
                    </>
                ) : (
                    <>
                        <Play className="mr-1.5 h-3 w-3" />
                        Compute
                    </>
                )}
            </Button>
            {result && <ComputeResultBanner result={result} />}
        </Card>
    );
}

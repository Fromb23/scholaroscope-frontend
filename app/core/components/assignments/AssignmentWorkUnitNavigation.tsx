'use client';

import { Button } from '@/app/components/ui/Button';

interface AssignmentWorkUnitNavigationProps {
    label: string;
    currentIndex: number;
    totalCount: number;
    onPrevious: () => void;
    onNext: () => void;
    disabled?: boolean;
    queueDescription?: string;
}

export function AssignmentWorkUnitNavigation({
    label,
    currentIndex,
    totalCount,
    onPrevious,
    onNext,
    disabled = false,
    queueDescription,
}: AssignmentWorkUnitNavigationProps) {
    const previousDisabled = disabled || currentIndex <= 0 || totalCount <= 0;
    const nextDisabled = disabled || currentIndex >= totalCount - 1 || totalCount <= 0;
    const safeIndex = totalCount > 0 ? currentIndex + 1 : 0;

    return (
        <div className="flex flex-col gap-2 rounded-lg border theme-border theme-surface-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
                type="button"
                variant="secondary"
                onClick={onPrevious}
                disabled={previousDisabled}
                className="w-full sm:w-auto"
            >
                Previous
            </Button>
            <div className="text-center">
                <div className="text-sm font-medium theme-text">
                    {label} {safeIndex} of {totalCount}
                </div>
                {queueDescription ? (
                    <div className="text-xs theme-muted">{queueDescription}</div>
                ) : null}
            </div>
            <Button
                type="button"
                variant="secondary"
                onClick={onNext}
                disabled={nextDisabled}
                className="w-full sm:w-auto"
            >
                Next
            </Button>
        </div>
    );
}

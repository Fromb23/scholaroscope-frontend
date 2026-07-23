'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
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
        <div className="flex items-center justify-between gap-3 rounded-lg border theme-border theme-surface-elevated px-3 py-2">
            <Button
                type="button"
                variant="secondary"
                onClick={onPrevious}
                disabled={previousDisabled}
                className="min-h-11 min-w-11 px-2"
                aria-label="Previous learner"
            >
                <ChevronLeft className="h-5 w-5" />
                <span className="hidden md:inline">Previous</span>
            </Button>
            <div className="min-w-0 flex-1 text-center">
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
                className="min-h-11 min-w-11 px-2"
                aria-label="Next learner"
            >
                <span className="hidden md:inline">Next</span>
                <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
    );
}

'use client';

import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';

interface AttendanceReportFiltersProps {
    selectedTerm: number | null;
    selectedCohort?: number;
    termsLoading: boolean;
    cohortsLoading: boolean;
    termOptions: Array<{ value: string; label: string }>;
    cohortOptions: Array<{ value: string; label: string }>;
    onTermChange: (value: string) => void;
    onCohortChange: (value: string) => void;
}

export function AttendanceReportFilters({
    selectedTerm,
    selectedCohort,
    termsLoading,
    cohortsLoading,
    termOptions,
    cohortOptions,
    onTermChange,
    onCohortChange,
}: AttendanceReportFiltersProps) {
    return (
        <Card>
            <div className="grid gap-4 md:grid-cols-2">
                <Select
                    label="Term"
                    value={selectedTerm?.toString() ?? ''}
                    onChange={(event) => onTermChange(event.target.value)}
                    disabled={termsLoading}
                    options={termOptions}
                />
                <Select
                    label="Cohort (optional)"
                    value={selectedCohort?.toString() ?? ''}
                    onChange={(event) => onCohortChange(event.target.value)}
                    disabled={cohortsLoading}
                    options={cohortOptions}
                />
            </div>
        </Card>
    );
}

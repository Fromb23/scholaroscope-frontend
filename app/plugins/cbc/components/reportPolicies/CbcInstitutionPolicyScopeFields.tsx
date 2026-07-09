'use client';

import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';

export interface CbcSubjectProfileOption {
    id: number;
    label: string;
}

export interface CbcCohortSubjectOption {
    id: number;
    label: string;
    cohortId?: number | null;
    cohortSubjectId?: number | null;
    subjectProfileId?: number | null;
}

export interface CbcCohortOption {
    id: number;
    label: string;
}

interface CbcInstitutionPolicyScopeFieldsProps {
    cohortId: number | null;
    cohortSubjectId: number | null;
    subjectProfileId: number | null;
    subjectProfiles: CbcSubjectProfileOption[];
    cohorts: CbcCohortOption[];
    cohortSubjects: CbcCohortSubjectOption[];
    cohortError?: string;
    cohortSubjectError?: string;
    subjectProfileError?: string;
    subjectProfileRef?: (node: HTMLSelectElement | null) => void;
    showAdvancedReference: boolean;
    onToggleAdvancedReference: () => void;
    onSelectCohort: (cohortId: number | null) => void;
    onSelectCohortSubject: (cohortSubjectId: number | null) => void;
    onSelectSubjectProfile: (subjectProfileId: number | null) => void;
}

export function CbcInstitutionPolicyScopeFields({
    cohortId,
    cohortSubjectId,
    subjectProfileId,
    subjectProfiles,
    cohorts,
    cohortSubjects,
    cohortError,
    cohortSubjectError,
    subjectProfileError,
    subjectProfileRef,
    showAdvancedReference,
    onToggleAdvancedReference,
    onSelectCohort,
    onSelectCohortSubject,
    onSelectSubjectProfile,
}: CbcInstitutionPolicyScopeFieldsProps) {
    return (
        <>
            <Select
                label="Class policy"
                value={cohortId?.toString() ?? ''}
                onChange={(event) => onSelectCohort(
                    event.target.value ? Number(event.target.value) : null,
                )}
                error={cohortError}
                helperText={cohorts.length === 0
                    ? 'No classes are registered for this organization.'
                    : 'Choose a class for class policy scope.'}
                options={cohorts.length === 0
                    ? [{ value: '', label: 'No classes are registered for this organization.', disabled: true }]
                    : [
                        { value: '', label: 'Workspace default (any class)' },
                        ...cohorts.map((cohort) => ({
                            value: String(cohort.id),
                            label: `Class: ${cohort.label}`,
                        })),
                    ]}
            />
            <Select
                label="Class subject policy"
                value={cohortSubjectId?.toString() ?? ''}
                onChange={(event) => onSelectCohortSubject(
                    event.target.value ? Number(event.target.value) : null,
                )}
                error={cohortSubjectError}
                options={[
                    {
                        value: '',
                        label: cohortSubjects.length
                            ? 'No class subject selected'
                            : 'No class subjects are registered for this class.',
                        disabled: cohortSubjects.length === 0,
                    },
                    ...cohortSubjects.map((subject) => ({
                        value: String(subject.id),
                        label: subject.label,
                    })),
                ]}
            />
            <div className="space-y-3 md:col-span-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onToggleAdvancedReference}
                >
                    Advanced reference/template
                </Button>
                {showAdvancedReference ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <Select
                            ref={subjectProfileRef}
                            label="Catalog reference"
                            value={subjectProfileId?.toString() ?? ''}
                            onChange={(event) => onSelectSubjectProfile(
                                event.target.value ? Number(event.target.value) : null,
                            )}
                            error={subjectProfileError}
                            helperText="Catalog reference only - not used for official organization computation until cloned/approved."
                            options={[
                                { value: '', label: 'No catalog reference' },
                                ...subjectProfiles.map((profile) => ({
                                    value: String(profile.id),
                                    label: profile.label,
                                })),
                            ]}
                        />
                    </div>
                ) : null}
            </div>
            <p className="text-xs text-gray-500 md:col-span-3">
                Use workspace defaults, class policies, class subject policies, or registered subject policies for operational report governance.
            </p>
        </>
    );
}

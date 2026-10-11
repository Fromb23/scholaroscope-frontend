'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import Modal from '@/app/components/ui/Modal';
import {
    CbcPathwayConfigurationFields,
    type CbcPathwayConfigurationValue,
} from '@/app/core/components/cohorts/CbcPathwayConfigurationFields';
import type { Cohort } from '@/app/core/types/academic';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import { cbcPathwayAPI } from '@/app/plugins/cbc/api/pathways';
import type { CbcCohortProfileSummary } from '@/app/plugins/cbc/types/pathways';

interface CbcPathwayConfigurationModalProps {
    isOpen: boolean;
    cohort: Pick<Cohort, 'id' | 'name' | 'level' | 'cbc_profile'> | null;
    onClose: () => void;
    onConfigured?: (profile: CbcCohortProfileSummary) => void | Promise<void>;
}

function buildInitialValue(cohort: Pick<Cohort, 'cbc_profile'> | null): CbcPathwayConfigurationValue {
    return {
        pathwayId: cohort?.cbc_profile?.pathway_id ? String(cohort.cbc_profile.pathway_id) : '',
        trackId: cohort?.cbc_profile?.track_id ? String(cohort.cbc_profile.track_id) : '',
        combinationId: cohort?.cbc_profile?.combination_id ? String(cohort.cbc_profile.combination_id) : '',
    };
}

export function CbcPathwayConfigurationModal({
    isOpen,
    cohort,
    onClose,
    onConfigured,
}: CbcPathwayConfigurationModalProps) {
    const [value, setValue] = useState<CbcPathwayConfigurationValue>(buildInitialValue(cohort));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [conflictingSubjects, setConflictingSubjects] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        setValue(buildInitialValue(cohort));
        setSaving(false);
        setError(null);
        setConflictingSubjects([]);
    }, [cohort, isOpen]);

    const handleSave = async () => {
        if (!cohort) {
            setError('Cohort details are not available.');
            return;
        }

        if (!value.pathwayId) {
            setError('Choose the class pathway first.');
            return;
        }

        setSaving(true);
        setError(null);
        setConflictingSubjects([]);

        try {
            const profile = await cbcPathwayAPI.configureCohortProfile(cohort.id, {
                pathwayId: Number(value.pathwayId),
                trackId: value.trackId ? Number(value.trackId) : null,
                combinationId: value.combinationId ? Number(value.combinationId) : null,
            });
            await onConfigured?.(profile);
            onClose();
        } catch (err) {
            const apiError = err as ApiError;
            const data = apiError.response?.data;
            const structured = data && typeof data === 'object' && !Array.isArray(data) && 'error' in data
                ? data.error
                : undefined;
            const incompatible = structured
                && typeof structured === 'object'
                && !Array.isArray(structured)
                ? structured.context?.incompatible_subjects
                : undefined;
            if (Array.isArray(incompatible)) {
                setConflictingSubjects(
                    incompatible
                        .map((item) => (
                            item && typeof item === 'object' && 'subject_name' in item
                                ? String(item.subject_name)
                                : ''
                        ))
                        .filter(Boolean),
                );
            }
            setError(resolveErrorMessage(apiError, 'Failed to configure CBC pathway.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!saving) {
                    onClose();
                }
            }}
            title={cohort ? `Set Up Subjects for ${cohort.name}` : 'Set Up Subjects'}
            size="lg"
        >
            <div className="space-y-5">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">Class Subject Setup</p>
                    <p className="mt-1 text-sm text-gray-600">
                        Choose the class pathway first, then review the subjects this class can offer.
                    </p>
                </div>

                {error ? (
                    <ErrorBanner
                        message={error}
                        onDismiss={() => setError(null)}
                    />
                ) : null}

                {conflictingSubjects.length > 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <p className="font-semibold">Resolve these cohort subjects before changing the pathway:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                            {conflictingSubjects.map((subjectName) => (
                                <li key={subjectName}>{subjectName}</li>
                            ))}
                        </ul>
                        <p className="mt-2">No subjects were removed and the existing pathway remains unchanged.</p>
                    </div>
                ) : null}

                <CbcPathwayConfigurationFields
                    catalog={cbcPathwayAPI}
                    level={cohort?.level ?? ''}
                    value={value}
                    disabled={saving}
                    onChange={setValue}
                />

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save class setup'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

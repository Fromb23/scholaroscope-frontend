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
import { extractErrorMessage } from '@/app/core/types/errors';
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

    useEffect(() => {
        if (!isOpen) return;
        setValue(buildInitialValue(cohort));
        setSaving(false);
        setError(null);
    }, [cohort, isOpen]);

    const handleSave = async () => {
        if (!cohort) {
            setError('Cohort details are not available.');
            return;
        }

        if (!value.pathwayId || !value.trackId || !value.combinationId) {
            setError('Select pathway, track, and subject combination before saving.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const offeredCombination = await cbcPathwayAPI.offerCombination(Number(value.combinationId));
            const profile = await cbcPathwayAPI.configureCohortProfile(cohort.id, offeredCombination.id);
            await onConfigured?.(profile);
            onClose();
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to configure CBC pathway.'));
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
            title={cohort ? `CBC Pathway Setup — ${cohort.name}` : 'CBC Pathway Setup'}
            size="lg"
        >
            <div className="space-y-5">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">CBC Senior School Configuration</p>
                    <p className="mt-1 text-sm text-gray-600">
                        Set the pathway, track, and subject combination that controls which pathway subjects can be linked to this cohort.
                    </p>
                </div>

                {error ? (
                    <ErrorBanner
                        message={error}
                        onDismiss={() => setError(null)}
                    />
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
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

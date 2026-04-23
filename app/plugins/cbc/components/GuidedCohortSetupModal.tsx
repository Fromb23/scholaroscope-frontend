'use client';

import { useState } from 'react';
import { useCohorts } from '@/app/core/hooks/useAcademic';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import type { Strand } from '@/app/plugins/cbc/types/cbc';
import { cohortAPI } from '@/app/core/api/academic';

interface Props {
    strand: Strand;
    subjectLevel: string;
    onComplete: () => void;
    onClose: () => void;
}

type Step = 'select' | 'assign' | 'success';

export function GuidedCohortSetupModal({ strand, subjectLevel, onComplete, onClose }: Props) {
    const { cohorts, loading, refetch } = useCohorts({ level: subjectLevel });
    const [step, setStep] = useState<Step>('select');
    const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const selectedCohort = cohorts.find(c => c.id === selectedCohortId);

    const handleAssign = async () => {
        if (!selectedCohortId || !strand.subject_org_id) return;
        setSaving(true);
        setError(null);
        try {
            await cohortAPI.assignSubject(
                selectedCohortId,
                strand.subject_org_id,
                true
            );
            setStep('success');
            setTimeout(() => {
                onComplete();
                onClose();
            }, 2000);
        } catch {
            setError('Failed to assign subject to cohort.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">

                {/* Header */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Set up cohort context</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Strand <span className="font-medium">{strand.name}</span> needs a cohort assigned to <span className="font-medium">{strand.subject_name}</span>.
                    </p>
                </div>

                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                {/* Step 1 — Select cohort */}
                {step === 'select' && (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                            Step 1 — Select a cohort for level {subjectLevel}
                        </p>
                        {loading ? (
                            <LoadingSpinner fullScreen={false} />
                        ) :
                            cohorts.length === 0 ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-500">
                                        No cohorts found for <span className="font-medium">{subjectLevel}</span>.
                                        Create one first then come back here.
                                    </p>
                                    <div className="flex gap-2">
                                        <a href="/academic/cohorts">
                                            <Button variant="secondary" size="sm">Create Cohort ↗</Button>
                                        </a>
                                        <Button variant="ghost" size="sm" onClick={refetch}>
                                            I&apos;ve created it - refresh
                                        </Button>
                                    </div>
                                </div>
                            )
                                : (
                                    <Select
                                        value={selectedCohortId?.toString() ?? ''}
                                        onChange={e => setSelectedCohortId(Number(e.target.value))}
                                        options={[
                                            { value: '', label: 'Select a cohort...' },
                                            ...cohorts.map(c => ({ value: String(c.id), label: c.name })),
                                        ]}
                                    />
                                )}
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            {cohorts.length > 0 && (
                                <Button disabled={!selectedCohortId} onClick={() => setStep('assign')}>
                                    Next
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2 — Confirm assignment */}
                {step === 'assign' && (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                            Step 2 — Assign subject to cohort
                        </p>
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-1 text-sm">
                            <p><span className="text-gray-500">Cohort:</span> <span className="font-medium">{selectedCohort?.name}</span></p>
                            <p><span className="text-gray-500">Subject:</span> <span className="font-medium">{strand.subject_name}</span></p>
                            <p><span className="text-gray-500">Strand:</span> <span className="font-medium">{strand.name}</span></p>
                        </div>
                        <p className="text-xs text-gray-400">
                            This will link the subject to the cohort. You can manage subject assignments later from the cohort page.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setStep('select')}>Back</Button>
                            <Button onClick={handleAssign} disabled={saving}>
                                {saving ? 'Assigning...' : 'Assign Subject'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Success */}
                {step === 'success' && (
                    <div className="text-center py-4 space-y-2">
                        <p className="text-green-600 font-medium text-lg">✓ Subject assigned</p>
                        <p className="text-sm text-gray-500">Returning to browser...</p>
                    </div>
                )}
            </div>
        </div>
    );
}

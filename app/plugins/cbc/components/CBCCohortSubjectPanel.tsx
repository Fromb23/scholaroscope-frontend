'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Lock, X } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Select } from '@/app/components/ui/Select';
import { cohortAPI } from '@/app/core/api/academic';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { CohortSubjectPanelContext } from '@/app/core/registry/cohortSubjectPanels';
import { cbcPathwayAPI } from '@/app/plugins/cbc/api/pathways';
import type {
    CbcAllowedSubject,
    CbcCohortAllowedSubjects,
    CbcSubjectCombination,
    CbcTrack,
    CbcPathway,
} from '@/app/plugins/cbc/types/pathways';

interface SetupValue {
    pathwayId: string;
    trackId: string;
    combinationId: string;
}

function buildCombinationLabel(combination: CbcSubjectCombination): string {
    if (combination.name?.trim()) {
        return combination.name.trim();
    }
    return `Official grouping ${combination.official_code}`;
}

function statusVariant(label?: string | null) {
    switch (label) {
        case 'Added to class':
            return 'green' as const;
        case 'Required':
            return 'blue' as const;
        case 'Ready to add':
            return 'info' as const;
        case 'Not ready yet':
            return 'warning' as const;
        case 'Not allowed for this class':
            return 'default' as const;
        default:
            return 'default' as const;
    }
}

function SubjectRow({
    subject,
    isHistorical,
    working,
    onAdd,
    onRemove,
}: {
    subject: CbcAllowedSubject;
    isHistorical: boolean;
    working: boolean;
    onAdd: (subject: CbcAllowedSubject) => void;
    onRemove: (subject: CbcAllowedSubject) => void;
}) {
    const addedToClass = Boolean(subject.added_to_class);
    const canAdd = !addedToClass && Boolean(subject.ui_action_label);
    const canRemove = addedToClass && !subject.locked;

    return (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{subject.subject_name}</p>
                    <span className="font-mono text-xs text-gray-500">{subject.subject_code}</span>
                    {subject.ui_status_label ? (
                        <Badge variant={statusVariant(subject.ui_status_label)} size="sm">
                            {subject.ui_status_label}
                        </Badge>
                    ) : null}
                    {subject.ui_requirement_label ? (
                        <Badge variant={statusVariant(subject.ui_requirement_label)} size="sm">
                            {subject.ui_requirement_label}
                        </Badge>
                    ) : null}
                </div>
                {subject.ui_note ? (
                    <p className="text-xs text-gray-600">{subject.ui_note}</p>
                ) : null}
            </div>

            {!isHistorical && (canAdd || canRemove) ? (
                <Button
                    type="button"
                    size="sm"
                    variant={canRemove ? 'secondary' : 'primary'}
                    disabled={working}
                    onClick={() => (canRemove ? onRemove(subject) : onAdd(subject))}
                >
                    {canRemove ? 'Remove' : subject.ui_action_label}
                </Button>
            ) : null}
        </div>
    );
}

export function CBCCohortSubjectPanel({
    cohortId,
    cohortLevel,
    isHistorical,
    onSubjectsChanged,
}: CohortSubjectPanelContext) {
    const [snapshot, setSnapshot] = useState<CbcCohortAllowedSubjects | null>(null);
    const [pathways, setPathways] = useState<CbcPathway[]>([]);
    const [tracks, setTracks] = useState<CbcTrack[]>([]);
    const [combinations, setCombinations] = useState<CbcSubjectCombination[]>([]);
    const [value, setValue] = useState<SetupValue>({
        pathwayId: '',
        trackId: '',
        combinationId: '',
    });
    const [loading, setLoading] = useState(true);
    const [pathwaysLoading, setPathwaysLoading] = useState(false);
    const [tracksLoading, setTracksLoading] = useState(false);
    const [combinationsLoading, setCombinationsLoading] = useState(false);
    const [working, setWorking] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadSnapshot = useCallback(async () => {
        setLoading(true);
        try {
            const allowed = await cbcPathwayAPI.getCohortAllowedSubjects(cohortId);
            setSnapshot(allowed);
            setValue({
                pathwayId: allowed.pathway ? String(allowed.pathway.id) : '',
                trackId: allowed.track ? String(allowed.track.id) : '',
                combinationId: allowed.combination ? String(allowed.combination.id) : '',
            });
            setError(null);
        } catch (err) {
            setError(resolveErrorMessage(err as ApiError, 'Failed to load class subject setup.'));
        } finally {
            setLoading(false);
        }
    }, [cohortId]);

    useEffect(() => {
        void loadSnapshot();
    }, [loadSnapshot]);

    useEffect(() => {
        let active = true;
        setPathwaysLoading(true);

        void cbcPathwayAPI.listPathways()
            .then((rows) => {
                if (!active) return;
                setPathways(rows);
            })
            .catch((err: unknown) => {
                if (!active) return;
                setError(resolveErrorMessage(err, 'Failed to load class pathways.'));
            })
            .finally(() => {
                if (active) {
                    setPathwaysLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!value.pathwayId) {
            setTracks([]);
            return;
        }

        let active = true;
        setTracksLoading(true);

        void cbcPathwayAPI.listTracks(Number(value.pathwayId))
            .then((rows) => {
                if (!active) return;
                setTracks(rows);
                setValue((previous) => {
                    const hasCurrent = rows.some((track) => String(track.id) === previous.trackId);
                    if (hasCurrent) return previous;
                    if (rows.length === 1) {
                        return {
                            ...previous,
                            trackId: String(rows[0].id),
                            combinationId: '',
                        };
                    }
                    return {
                        ...previous,
                        trackId: '',
                        combinationId: '',
                    };
                });
            })
            .catch((err: unknown) => {
                if (!active) return;
                setError(resolveErrorMessage(err, 'Failed to load class pathway details.'));
            })
            .finally(() => {
                if (active) {
                    setTracksLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [value.pathwayId]);

    useEffect(() => {
        if (!value.trackId) {
            setCombinations([]);
            return;
        }

        let active = true;
        setCombinationsLoading(true);

        void cbcPathwayAPI.listCombinations(Number(value.trackId), cohortLevel)
            .then((rows) => {
                if (!active) return;
                setCombinations(rows);
                setValue((previous) => {
                    const hasCurrent = rows.some((combination) => String(combination.id) === previous.combinationId);
                    if (hasCurrent) return previous;
                    if (rows.length === 1) {
                        return {
                            ...previous,
                            combinationId: String(rows[0].id),
                        };
                    }
                    return {
                        ...previous,
                        combinationId: '',
                    };
                });
            })
            .catch((err: unknown) => {
                if (!active) return;
                setError(resolveErrorMessage(err, 'Failed to load official class grouping.'));
            })
            .finally(() => {
                if (active) {
                    setCombinationsLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [cohortLevel, value.trackId]);

    const hasConfigurationChanges = useMemo(() => {
        if (!snapshot) return false;
        return (
            value.pathwayId !== (snapshot.pathway ? String(snapshot.pathway.id) : '')
            || value.trackId !== (snapshot.track ? String(snapshot.track.id) : '')
            || value.combinationId !== (snapshot.combination ? String(snapshot.combination.id) : '')
        );
    }, [snapshot, value]);

    const handleSavePathway = async () => {
        if (!value.pathwayId) {
            setError('Choose the class pathway first.');
            return;
        }

        setWorking(true);
        setSuccessMessage(null);
        setError(null);

        try {
            const profile = await cbcPathwayAPI.configureCohortProfile(cohortId, {
                pathwayId: Number(value.pathwayId),
                trackId: value.trackId ? Number(value.trackId) : null,
                combinationId: value.combinationId ? Number(value.combinationId) : null,
            });
            await loadSnapshot();
            await onSubjectsChanged?.();
            setSuccessMessage(profile.message ?? 'Required subjects added for all learners.');
        } catch (err) {
            setError(resolveErrorMessage(err as ApiError, 'Failed to save class pathway.'));
        } finally {
            setWorking(false);
        }
    };

    const handleAddSubject = async (subject: CbcAllowedSubject) => {
        setWorking(true);
        setSuccessMessage(null);
        setError(null);

        try {
            const response = await cohortAPI.assignSubject(
                cohortId,
                subject.subject_id,
                subject.category === 'CORE',
                { subjectProfileId: subject.subject_profile_id },
            );
            await loadSnapshot();
            await onSubjectsChanged?.();
            setSuccessMessage(response.message ?? 'Subject added to class.');
        } catch (err) {
            setError(resolveErrorMessage(err as ApiError, 'Failed to add subject to class.'));
        } finally {
            setWorking(false);
        }
    };

    const handleRemoveSubject = async (subject: CbcAllowedSubject) => {
        if (!subject.subject_id) return;

        setWorking(true);
        setSuccessMessage(null);
        setError(null);

        try {
            await cohortAPI.removeSubject(cohortId, subject.subject_id);
            await loadSnapshot();
            await onSubjectsChanged?.();
            setSuccessMessage('Subject removed from class.');
        } catch (err) {
            setError(resolveErrorMessage(err as ApiError, 'Failed to remove subject from class.'));
        } finally {
            setWorking(false);
        }
    };

    if (loading) {
        return (
            <div className="py-6 text-center">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (!snapshot) {
        return null;
    }

    return (
        <div className="space-y-5">
            {successMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {successMessage}
                </div>
            ) : null}

            {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">Class Subject Setup</p>
                    <Badge variant={snapshot.summary.status === 'READY' ? 'green' : 'warning'} size="sm">
                        {snapshot.summary.status_label}
                    </Badge>
                </div>
                <p className="mt-2 text-sm text-gray-700">{snapshot.summary.description}</p>
            </div>

            <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="space-y-1">
                    <h3 className="text-base font-semibold text-gray-900">Class pathway</h3>
                    <p className="text-sm text-gray-600">{snapshot.summary.pathway_text}</p>
                </div>

                <Select
                    label={snapshot.pathway ? 'Change pathway' : 'Which pathway is this class following?'}
                    value={value.pathwayId}
                    onChange={(event) => {
                        setSuccessMessage(null);
                        setError(null);
                        setValue({
                            pathwayId: event.target.value,
                            trackId: '',
                            combinationId: '',
                        });
                    }}
                    disabled={isHistorical || working || pathwaysLoading}
                    options={[
                        {
                            value: '',
                            label: pathwaysLoading ? 'Loading pathways...' : 'Select pathway',
                        },
                        ...pathways.map((pathway) => ({
                            value: String(pathway.id),
                            label: pathway.name,
                        })),
                    ]}
                />

                <details className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <summary className="cursor-pointer list-none text-sm font-medium text-gray-900">
                        Advanced details
                    </summary>
                    <div className="mt-4 space-y-4">
                        <p className="text-xs text-gray-600">
                            Use these only when you need to match the official ministry grouping for this class.
                        </p>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Select
                                label="Track"
                                value={value.trackId}
                                onChange={(event) => {
                                    setSuccessMessage(null);
                                    setError(null);
                                    setValue((previous) => ({
                                        ...previous,
                                        trackId: event.target.value,
                                        combinationId: '',
                                    }));
                                }}
                                disabled={isHistorical || working || !value.pathwayId || tracksLoading}
                                options={[
                                    {
                                        value: '',
                                        label: tracksLoading ? 'Loading tracks...' : 'Select track',
                                    },
                                    ...tracks.map((track) => ({
                                        value: String(track.id),
                                        label: track.name,
                                    })),
                                ]}
                            />
                            <Select
                                label="Official grouping"
                                value={value.combinationId}
                                onChange={(event) => {
                                    setSuccessMessage(null);
                                    setError(null);
                                    setValue((previous) => ({
                                        ...previous,
                                        combinationId: event.target.value,
                                    }));
                                }}
                                disabled={isHistorical || working || !value.trackId || combinationsLoading}
                                options={[
                                    {
                                        value: '',
                                        label: combinationsLoading ? 'Loading groupings...' : 'Select official grouping',
                                    },
                                    ...combinations.map((combination) => ({
                                        value: String(combination.id),
                                        label: buildCombinationLabel(combination),
                                    })),
                                ]}
                            />
                        </div>
                        {snapshot.track || snapshot.combination ? (
                            <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
                                {snapshot.track ? <p>Track: {snapshot.track.name}</p> : null}
                                {snapshot.combination ? (
                                    <p>Official grouping: {snapshot.combination.name || snapshot.combination.official_code}</p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </details>

                {!isHistorical ? (
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            onClick={handleSavePathway}
                            disabled={
                                working
                                || !value.pathwayId
                                || (!hasConfigurationChanges && Boolean(snapshot.pathway))
                            }
                        >
                            {working ? 'Saving...' : 'Save class pathway'}
                        </Button>
                    </div>
                ) : null}
            </section>

            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-blue-600" />
                    <h3 className="text-base font-semibold text-gray-900">Required Subjects</h3>
                </div>
                <p className="text-sm text-gray-600">
                    These subjects are compulsory for all learners in this class.
                </p>
                {snapshot.core.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                        Required subjects will appear here after the class pathway is saved.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {snapshot.core.map((subject) => (
                            <SubjectRow
                                key={`core:${subject.subject_profile_id}`}
                                subject={subject}
                                isHistorical={isHistorical}
                                working={working}
                                onAdd={handleAddSubject}
                                onRemove={handleRemoveSubject}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <h3 className="text-base font-semibold text-gray-900">Subjects This Class Can Offer</h3>
                </div>
                <p className="text-sm text-gray-600">
                    Choose the subjects available for this class.
                </p>

                {snapshot.pathway_allowed_subjects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                        {snapshot.pathway
                            ? 'No extra subjects are ready to add yet.'
                            : 'Choose the pathway above to see the subjects this class can offer.'}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {snapshot.pathway_allowed_subjects.map((subject) => (
                            <SubjectRow
                                key={`pathway:${subject.subject_profile_id}`}
                                subject={subject}
                                isHistorical={isHistorical}
                                working={working}
                                onAdd={handleAddSubject}
                                onRemove={handleRemoveSubject}
                            />
                        ))}
                    </div>
                )}

                {snapshot.blocked.length > 0 ? (
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-gray-500" />
                            <p className="text-sm font-medium text-gray-700">Not allowed for this class</p>
                        </div>
                        <div className="space-y-2">
                            {snapshot.blocked.map((subject) => (
                                <div
                                    key={`blocked:${subject.subject_profile_id}:${subject.subject_name}`}
                                    className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                                >
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-gray-900">{subject.subject_name}</p>
                                            <span className="font-mono text-xs text-gray-500">{subject.subject_code}</span>
                                            <Badge variant="default" size="sm">Not allowed for this class</Badge>
                                        </div>
                                        <p className="text-xs text-gray-600">{subject.ui_note ?? subject.blocked_reason}</p>
                                    </div>
                                    <X className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>

            {isHistorical ? (
                <p className="text-center text-xs text-gray-400">
                    This class is from a past academic year and its subject setup is read-only.
                </p>
            ) : null}
        </div>
    );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Select } from '@/app/components/ui/Select';
import type { CbcPathwayAllowedSubjectCatalogueItem } from '@/app/core/types/cbcPathways';
import type {
    OfficialPathway,
    OfficialPathwayCatalog,
    OfficialSubjectCombination,
    OfficialTrack,
} from '@/app/core/types/curriculumExtensions';

export interface CbcPathwayConfigurationValue {
    pathwayId: string;
    trackId: string;
    combinationId: string;
}

interface CbcPathwayConfigurationFieldsProps {
    catalog: OfficialPathwayCatalog;
    level: string;
    value: CbcPathwayConfigurationValue;
    disabled?: boolean;
    onChange: (value: CbcPathwayConfigurationValue) => void;
}

function getCombinationLabel(combination: OfficialSubjectCombination): string {
    const subjectNames = Array.isArray(combination.subjects)
        ? combination.subjects
            .map((subject) => subject.subject_name)
            .filter(Boolean)
            .join(', ')
        : '';

    if (subjectNames) {
        return `#${combination.official_code} — ${subjectNames}`;
    }

    if (combination.name) {
        return `#${combination.official_code} — ${combination.name}`;
    }

    return `#${combination.official_code}`;
}

function AllowedSubjectGroup({
    title,
    description,
    subjects,
}: {
    title: string;
    description: string;
    subjects: CbcPathwayAllowedSubjectCatalogueItem[];
}) {
    return (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-600">{description}</p>
            </div>

            {subjects.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                    No subjects are available for this selection yet.
                </p>
            ) : (
                <div className="space-y-2">
                    {subjects.map((subject) => (
                        <div
                            key={`${subject.category}:${subject.subject_profile_id}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">{subject.subject_name}</p>
                                <p className="text-xs text-gray-500">{subject.subject_code}</p>
                            </div>
                            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">
                                {subject.category}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function CbcPathwayConfigurationFields({
    catalog,
    level,
    value,
    disabled = false,
    onChange,
}: CbcPathwayConfigurationFieldsProps) {
    const [pathways, setPathways] = useState<OfficialPathway[]>([]);
    const [tracks, setTracks] = useState<OfficialTrack[]>([]);
    const [combinations, setCombinations] = useState<OfficialSubjectCombination[]>([]);
    const [pathwayCatalogue, setPathwayCatalogue] = useState<Awaited<
        ReturnType<OfficialPathwayCatalog['listPathwayAllowedSubjects']>
    > | null>(null);
    const [pathwaysLoading, setPathwaysLoading] = useState(false);
    const [tracksLoading, setTracksLoading] = useState(false);
    const [combinationsLoading, setCombinationsLoading] = useState(false);
    const [pathwayCatalogueLoading, setPathwayCatalogueLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedPathway = useMemo(
        () => pathways.find((pathway) => String(pathway.id) === value.pathwayId) ?? null,
        [pathways, value.pathwayId],
    );

    useEffect(() => {
        let active = true;
        setPathwaysLoading(true);

        void catalog.listPathways()
            .then((rows) => {
                if (!active) return;
                setPathways(rows);
            })
            .catch((err: unknown) => {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Failed to load CBC pathways.');
            })
            .finally(() => {
                if (active) {
                    setPathwaysLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [catalog]);

    useEffect(() => {
        if (!value.pathwayId) {
            setTracks([]);
            setTracksLoading(false);
            return;
        }

        const pathwayId = Number(value.pathwayId);
        if (!Number.isFinite(pathwayId)) {
            setTracks([]);
            setTracksLoading(false);
            return;
        }

        let active = true;
        setTracksLoading(true);

        void catalog.listTracks(pathwayId)
            .then((rows) => {
                if (!active) return;
                setTracks(rows);
            })
            .catch((err: unknown) => {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Failed to load CBC tracks.');
            })
            .finally(() => {
                if (active) {
                    setTracksLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [catalog, value.pathwayId]);

    useEffect(() => {
        if (!value.pathwayId) {
            setPathwayCatalogue(null);
            setPathwayCatalogueLoading(false);
            return;
        }

        const pathwayId = Number(value.pathwayId);
        if (!Number.isFinite(pathwayId)) {
            setPathwayCatalogue(null);
            setPathwayCatalogueLoading(false);
            return;
        }

        let active = true;
        setPathwayCatalogueLoading(true);

        void catalog.listPathwayAllowedSubjects(pathwayId, level)
            .then((catalogue) => {
                if (!active) return;
                setPathwayCatalogue(catalogue);
            })
            .catch((err: unknown) => {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Failed to load pathway subject catalogue.');
            })
            .finally(() => {
                if (active) {
                    setPathwayCatalogueLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [catalog, level, value.pathwayId]);

    useEffect(() => {
        if (!value.trackId) {
            setCombinations([]);
            setCombinationsLoading(false);
            return;
        }

        const trackId = Number(value.trackId);
        if (!Number.isFinite(trackId)) {
            setCombinations([]);
            setCombinationsLoading(false);
            return;
        }

        let active = true;
        setCombinationsLoading(true);

        void catalog.listCombinations(trackId, level)
            .then((rows) => {
                if (!active) return;
                setCombinations(rows);
            })
            .catch((err: unknown) => {
                if (!active) return;
                setError(err instanceof Error ? err.message : 'Failed to load CBC subject combinations.');
            })
            .finally(() => {
                if (active) {
                    setCombinationsLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [catalog, level, value.trackId]);

    return (
        <div className="space-y-4">
            {error ? (
                <ErrorBanner
                    message={error}
                    onDismiss={() => setError(null)}
                    compact
                />
            ) : null}

            <div className="grid grid-cols-1 gap-4">
                <Select
                    label="Pathway"
                    value={value.pathwayId}
                    onChange={(event) => {
                        setError(null);
                        onChange({
                            pathwayId: event.target.value,
                            trackId: '',
                            combinationId: '',
                        });
                    }}
                    disabled={disabled || pathwaysLoading}
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
            </div>

            {value.pathwayId ? (
                <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900">Ministry Subject Catalogue</p>
                        <p className="text-xs text-gray-600">
                            Review the subject universe for this pathway before choosing the deeper track and official combination details.
                        </p>
                    </div>

                    {pathwayCatalogueLoading ? (
                        <p className="rounded-lg border border-dashed border-blue-200 bg-white px-3 py-4 text-sm text-gray-500">
                            Loading pathway subjects...
                        </p>
                    ) : pathwayCatalogue ? (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <AllowedSubjectGroup
                                title="Core Subjects"
                                description="Global CBC senior school requirements for this level."
                                subjects={pathwayCatalogue.core}
                            />
                            <AllowedSubjectGroup
                                title={`${selectedPathway?.name ?? 'Pathway'} Subjects`}
                                description="Ministry-defined subjects that can be offered under this pathway."
                                subjects={pathwayCatalogue.pathway_subjects}
                            />
                        </div>
                    ) : (
                        <p className="rounded-lg border border-dashed border-blue-200 bg-white px-3 py-4 text-sm text-gray-500">
                            Select a pathway to load the ministry subject catalogue.
                        </p>
                    )}
                </div>
            ) : null}

            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">Track and Official Combination</p>
                    <p className="text-xs text-gray-600">
                        These remain available for detailed ministry mapping, but subject eligibility is driven by the pathway catalogue above.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                        label="Track"
                        value={value.trackId}
                        onChange={(event) => {
                            setError(null);
                            onChange({
                                pathwayId: value.pathwayId,
                                trackId: event.target.value,
                                combinationId: '',
                            });
                        }}
                        disabled={disabled || !value.pathwayId || tracksLoading}
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
                        label="Official Combination"
                        value={value.combinationId}
                        onChange={(event) => {
                            setError(null);
                            onChange({
                                pathwayId: value.pathwayId,
                                trackId: value.trackId,
                                combinationId: event.target.value,
                            });
                        }}
                        disabled={disabled || !value.trackId || combinationsLoading}
                        options={[
                            {
                                value: '',
                                label: combinationsLoading ? 'Loading combinations...' : 'Select combination',
                            },
                            ...combinations.map((combination) => ({
                                value: String(combination.id),
                                label: getCombinationLabel(combination),
                            })),
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}

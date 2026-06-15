'use client';

import { useEffect, useState } from 'react';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Select } from '@/app/components/ui/Select';
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
    const [pathwaysLoading, setPathwaysLoading] = useState(false);
    const [tracksLoading, setTracksLoading] = useState(false);
    const [combinationsLoading, setCombinationsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    label="Subject Combination"
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
    );
}

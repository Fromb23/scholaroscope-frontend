'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { useCbcLessonPlanOutcomes } from '@/app/plugins/cbc/hooks/useCbcLessonPlanOutcomes';
import type { PlannedOutcome } from '@/app/core/types/lessonPlans';
import type { LessonPlanOutcomeSelectorProps } from '@/app/core/types/lessonPlanCurriculum';
import type { CbcLessonPlanOutcomeOption } from '@/app/plugins/cbc/types/cbc';

function toPlannedOutcome(outcome: CbcLessonPlanOutcomeOption): PlannedOutcome {
    return {
        plugin: 'cbc',
        outcome_id: outcome.outcome_id,
        code: outcome.code,
        text: outcome.text,
        strand: outcome.strand.name,
        sub_strand: outcome.sub_strand.name,
        strand_id: outcome.strand.id,
        sub_strand_id: outcome.sub_strand.id,
        subject_profile_id: outcome.subject_profile.id,
    };
}

function matchesSearch(outcome: CbcLessonPlanOutcomeOption, query: string): boolean {
    return `${outcome.code} ${outcome.text} ${outcome.strand.name} ${outcome.sub_strand.name}`
        .toLowerCase()
        .includes(query);
}

export function CbcLessonPlanOutcomeSelector({
    cohortSubjectId,
    value,
    onChange,
}: LessonPlanOutcomeSelectorProps) {
    const [search, setSearch] = useState('');
    const [selectedStrandId, setSelectedStrandId] = useState<number | ''>('');
    const [selectedSubStrandId, setSelectedSubStrandId] = useState<number | ''>('');
    const { data: outcomes = [], isLoading, error } = useCbcLessonPlanOutcomes(cohortSubjectId);

    const selectedIds = useMemo(
        () => new Set(value.filter((outcome) => outcome.plugin === 'cbc').map((outcome) => outcome.outcome_id)),
        [value]
    );

    const strandOptions = useMemo(() => {
        const strands = new Map<number, { id: number; name: string; outcomeCount: number }>();

        outcomes.forEach((outcome) => {
            const existing = strands.get(outcome.strand.id);
            if (existing) {
                existing.outcomeCount += 1;
                return;
            }

            strands.set(outcome.strand.id, {
                id: outcome.strand.id,
                name: outcome.strand.name,
                outcomeCount: 1,
            });
        });

        return Array.from(strands.values());
    }, [outcomes]);

    const subStrandOptions = useMemo(() => {
        if (selectedStrandId === '') {
            return [];
        }

        const subStrands = new Map<number, { id: number; name: string; outcomeCount: number }>();

        outcomes
            .filter((outcome) => outcome.strand.id === selectedStrandId)
            .forEach((outcome) => {
                const existing = subStrands.get(outcome.sub_strand.id);
                if (existing) {
                    existing.outcomeCount += 1;
                    return;
                }

                subStrands.set(outcome.sub_strand.id, {
                    id: outcome.sub_strand.id,
                    name: outcome.sub_strand.name,
                    outcomeCount: 1,
                });
            });

        return Array.from(subStrands.values());
    }, [outcomes, selectedStrandId]);

    const visibleOutcomes = useMemo(() => {
        if (selectedStrandId === '' || selectedSubStrandId === '') {
            return [];
        }

        return outcomes.filter((outcome) => (
            outcome.strand.id === selectedStrandId
            && outcome.sub_strand.id === selectedSubStrandId
        ));
    }, [outcomes, selectedStrandId, selectedSubStrandId]);

    const searchQuery = search.trim().toLowerCase();
    const searchGroups = useMemo(() => {
        if (!searchQuery) {
            return [];
        }

        const groups = new Map<
            string,
            {
                key: string;
                strandName: string;
                subStrandName: string;
                outcomes: CbcLessonPlanOutcomeOption[];
            }
        >();

        outcomes
            .filter((outcome) => matchesSearch(outcome, searchQuery))
            .forEach((outcome) => {
                const key = `${outcome.strand.id}-${outcome.sub_strand.id}`;
                const existing = groups.get(key) ?? {
                    key,
                    strandName: outcome.strand.name,
                    subStrandName: outcome.sub_strand.name,
                    outcomes: [],
                };

                existing.outcomes.push(outcome);
                groups.set(key, existing);
            });

        return Array.from(groups.values());
    }, [outcomes, searchQuery]);

    const orderedSelectedOutcomes = useMemo(() => {
        const selectedById = new Map(value.map((outcome) => [outcome.outcome_id, outcome]));
        const ordered = outcomes
            .filter((outcome) => selectedById.has(outcome.outcome_id))
            .map((outcome) => selectedById.get(outcome.outcome_id)!)
            .filter(Boolean);
        const orderedIds = new Set(ordered.map((outcome) => outcome.outcome_id));
        const extras = value.filter((outcome) => !orderedIds.has(outcome.outcome_id));

        return [...ordered, ...extras];
    }, [outcomes, value]);

    useEffect(() => {
        const allowedOutcomeIds = new Set(outcomes.map((outcome) => outcome.outcome_id));
        const normalizedValue = value.filter((outcome) => allowedOutcomeIds.has(outcome.outcome_id));

        if (normalizedValue.length !== value.length) {
            onChange(normalizedValue);
        }
    }, [onChange, outcomes, value]);

    useEffect(() => {
        setSelectedStrandId('');
        setSelectedSubStrandId('');
        setSearch('');
    }, [cohortSubjectId]);

    useEffect(() => {
        if (selectedStrandId !== '' && !strandOptions.some((strand) => strand.id === selectedStrandId)) {
            setSelectedStrandId('');
            setSelectedSubStrandId('');
        }
    }, [selectedStrandId, strandOptions]);

    useEffect(() => {
        if (selectedSubStrandId !== '' && !subStrandOptions.some((subStrand) => subStrand.id === selectedSubStrandId)) {
            setSelectedSubStrandId('');
        }
    }, [selectedSubStrandId, subStrandOptions]);

    const toggleOutcome = (outcome: CbcLessonPlanOutcomeOption, checked: boolean) => {
        if (checked) {
            const nextValue = [
                ...value.filter((item) => item.outcome_id !== outcome.outcome_id),
                toPlannedOutcome(outcome),
            ];

            const sortedValue = outcomes
                .filter((item) => nextValue.some((selected) => selected.outcome_id === item.outcome_id))
                .map(toPlannedOutcome);

            onChange(sortedValue);
            return;
        }

        onChange(value.filter((item) => item.outcome_id !== outcome.outcome_id));
    };

    return (
        <Card className="border-gray-200 bg-gray-50/60">
            <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <BookOpen className="h-4 w-4 text-gray-500" />
                        Learning outcomes
                    </div>
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                        {value.length} selected
                    </span>
                </div>

                <p className="text-sm text-gray-600">
                    Select the exact outcomes this lesson should cover. These teacher-selected outcomes constrain any generated draft.
                </p>

                <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900">Selected outcomes</p>
                            <p className="text-sm text-gray-500">
                                Keep the outcomes you want the draft to use. You can remove any selection at any time.
                            </p>
                        </div>
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {value.length} chosen
                        </span>
                    </div>

                    {orderedSelectedOutcomes.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            No outcomes selected yet.
                        </p>
                    ) : (
                        <div className="grid gap-3">
                            {orderedSelectedOutcomes.map((outcome) => (
                                <div
                                    key={`selected-outcome-${outcome.outcome_id}`}
                                    className="rounded-lg border border-blue-200 bg-blue-50/70 p-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-700">
                                                    {outcome.code}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {outcome.strand} · {outcome.sub_strand}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 line-clamp-2">
                                                {outcome.text}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onChange(value.filter((item) => item.outcome_id !== outcome.outcome_id))}
                                            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white hover:text-red-600"
                                            aria-label={`Remove ${outcome.code}`}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <LoadingSpinner message="Loading learning outcomes..." fullScreen={false} />
                ) : null}

                {error ? (
                    <p className="text-sm text-red-600">{error.message}</p>
                ) : null}

                {!isLoading && !error ? (
                    outcomes.length === 0 ? (
                        <p className="text-sm text-gray-600">
                            CBC learning outcomes are not available for this class subject. Ask an administrator to check the CBC setup.
                        </p>
                    ) : (
                        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Search outcomes
                                </label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search by code, strand, sub-strand, or learning outcome"
                                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {!searchQuery ? (
                                <div className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Select
                                            label="Strand"
                                            value={selectedStrandId}
                                            onChange={(event) => {
                                                const nextStrandId = event.target.value ? Number(event.target.value) : '';
                                                setSelectedStrandId(nextStrandId);
                                                setSelectedSubStrandId('');
                                            }}
                                            options={[
                                                { value: '', label: 'Choose a strand' },
                                                ...strandOptions.map((strand) => ({
                                                    value: strand.id,
                                                    label: `${strand.name} (${strand.outcomeCount})`,
                                                })),
                                            ]}
                                        />

                                        <Select
                                            label="Sub-strand"
                                            value={selectedSubStrandId}
                                            onChange={(event) => {
                                                setSelectedSubStrandId(event.target.value ? Number(event.target.value) : '');
                                            }}
                                            disabled={selectedStrandId === ''}
                                            options={[
                                                {
                                                    value: '',
                                                    label: selectedStrandId === ''
                                                        ? 'Choose a strand first'
                                                        : 'Choose a sub-strand',
                                                },
                                                ...subStrandOptions.map((subStrand) => ({
                                                    value: subStrand.id,
                                                    label: `${subStrand.name} (${subStrand.outcomeCount})`,
                                                })),
                                            ]}
                                        />
                                    </div>

                                    {selectedStrandId === '' ? (
                                        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                            Start by choosing the strand you want to teach.
                                        </p>
                                    ) : selectedSubStrandId === '' ? (
                                        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                            Choose the sub-strand to see the matching outcomes.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-sm font-semibold text-gray-900">
                                                    Outcomes in this sub-strand
                                                </h3>
                                                <span className="text-xs text-gray-500">
                                                    {visibleOutcomes.length} available
                                                </span>
                                            </div>

                                            <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                {visibleOutcomes.map((outcome) => (
                                                    <label
                                                        key={outcome.outcome_id}
                                                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                                                            selectedIds.has(outcome.outcome_id)
                                                                ? 'border-blue-300 bg-blue-50'
                                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(outcome.outcome_id)}
                                                            onChange={(event) => toggleOutcome(outcome, event.target.checked)}
                                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                                                        />
                                                        <div className="min-w-0 space-y-1 text-sm">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="font-medium text-gray-900">{outcome.code}</p>
                                                                {selectedIds.has(outcome.outcome_id) ? (
                                                                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                                                        Selected
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-gray-700">{outcome.text}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : searchGroups.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                    No outcomes match this search.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-semibold text-gray-900">Search results</h3>
                                        <span className="text-xs text-gray-500">
                                            {searchGroups.reduce((count, group) => count + group.outcomes.length, 0)} matches
                                        </span>
                                    </div>

                                    <div className="max-h-[32rem] space-y-4 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                                        {searchGroups.map((group) => (
                                            <div key={group.key} className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {group.strandName}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {group.subStrandName}
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    {group.outcomes.map((outcome) => (
                                                        <label
                                                            key={outcome.outcome_id}
                                                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                                                                selectedIds.has(outcome.outcome_id)
                                                                    ? 'border-blue-300 bg-blue-50'
                                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(outcome.outcome_id)}
                                                                onChange={(event) => toggleOutcome(outcome, event.target.checked)}
                                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                                                            />
                                                            <div className="min-w-0 space-y-1 text-sm">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className="font-medium text-gray-900">{outcome.code}</p>
                                                                    {selectedIds.has(outcome.outcome_id) ? (
                                                                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                                                            Selected
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                                <p className="text-gray-700">{outcome.text}</p>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                ) : null}
            </div>
        </Card>
    );
}

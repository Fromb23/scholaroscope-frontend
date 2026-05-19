'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
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

export function CbcLessonPlanOutcomeSelector({
    cohortSubjectId,
    value,
    onChange,
}: LessonPlanOutcomeSelectorProps) {
    const [search, setSearch] = useState('');
    const { data: outcomes = [], isLoading, error } = useCbcLessonPlanOutcomes(cohortSubjectId);

    const selectedIds = useMemo(
        () => new Set(value.filter((outcome) => outcome.plugin === 'cbc').map((outcome) => outcome.outcome_id)),
        [value]
    );

    const filteredOutcomes = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return outcomes;
        }

        return outcomes.filter((outcome) =>
            `${outcome.code} ${outcome.text} ${outcome.strand.name} ${outcome.sub_strand.name}`
                .toLowerCase()
                .includes(query)
        );
    }, [outcomes, search]);

    const groupedOutcomes = useMemo(() => {
        const groups = new Map<
            number,
            {
                strandId: number;
                strandName: string;
                subStrands: Map<number, { subStrandName: string; outcomes: CbcLessonPlanOutcomeOption[] }>;
            }
        >();

        filteredOutcomes.forEach((outcome) => {
            const strandGroup = groups.get(outcome.strand.id) ?? {
                strandId: outcome.strand.id,
                strandName: outcome.strand.name,
                subStrands: new Map(),
            };
            const subStrandGroup = strandGroup.subStrands.get(outcome.sub_strand.id) ?? {
                subStrandName: outcome.sub_strand.name,
                outcomes: [],
            };

            subStrandGroup.outcomes.push(outcome);
            strandGroup.subStrands.set(outcome.sub_strand.id, subStrandGroup);
            groups.set(outcome.strand.id, strandGroup);
        });

        return Array.from(groups.values());
    }, [filteredOutcomes]);

    useEffect(() => {
        const allowedOutcomeIds = new Set(outcomes.map((outcome) => outcome.outcome_id));
        const normalizedValue = value.filter((outcome) => allowedOutcomeIds.has(outcome.outcome_id));

        if (normalizedValue.length !== value.length) {
            onChange(normalizedValue);
        }
    }, [onChange, outcomes, value]);

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
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Step 2
                        </p>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <BookOpen className="h-4 w-4 text-gray-500" />
                            Choose learning outcomes
                        </div>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                        {value.length} selected
                    </span>
                </div>

                <p className="text-sm text-gray-600">
                    Select the exact outcomes this lesson should cover. These teacher-selected outcomes constrain any generated draft.
                </p>

                <Input
                    label="Search outcomes"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by code, strand, sub-strand, or learning outcome"
                />

                {isLoading ? (
                    <LoadingSpinner message="Loading learning outcomes..." fullScreen={false} />
                ) : null}

                {error ? (
                    <p className="text-sm text-red-600">{error.message}</p>
                ) : null}

                {value.length > 0 ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-gray-900">Selected outcomes</p>
                            <span className="text-xs font-medium text-blue-700">
                                {value.length} chosen
                            </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {value.map((outcome) => (
                                <span
                                    key={`selected-outcome-${outcome.outcome_id}`}
                                    className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs text-gray-700"
                                >
                                    <span className="font-medium text-gray-900">{outcome.code}</span>
                                    {' '}
                                    {outcome.text}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}

                {!isLoading && !error ? (
                    groupedOutcomes.length === 0 ? (
                        <p className="text-sm text-gray-600">
                            CBC learning outcomes are not available for this class subject. Ask an administrator to check the CBC setup.
                        </p>
                    ) : (
                        <div className="max-h-[32rem] space-y-4 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
                            {groupedOutcomes.map((strandGroup) => (
                                <div key={strandGroup.strandId} className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-semibold text-gray-900">
                                            {strandGroup.strandName}
                                        </h3>
                                        <span className="text-xs text-gray-500">
                                            {
                                                Array.from(strandGroup.subStrands.values())
                                                    .flatMap((subStrandGroup) => subStrandGroup.outcomes)
                                                    .filter((outcome) => selectedIds.has(outcome.outcome_id)).length
                                            }
                                            {' '}selected
                                        </span>
                                    </div>

                                    {Array.from(strandGroup.subStrands.entries()).map(([subStrandId, subStrandGroup]) => (
                                        <div key={subStrandId} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-medium text-gray-800">
                                                    {subStrandGroup.subStrandName}
                                                </p>
                                                <span className="text-xs text-gray-500">
                                                    {subStrandGroup.outcomes.filter((outcome) => selectedIds.has(outcome.outcome_id)).length}
                                                    {' '}selected
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {subStrandGroup.outcomes.map((outcome) => (
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
                                                        <div className="space-y-1 text-sm">
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
                            ))}
                        </div>
                    )
                ) : null}
            </div>
        </Card>
    );
}

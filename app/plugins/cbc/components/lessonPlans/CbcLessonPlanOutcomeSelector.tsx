'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { useCbcLessonPlanOutcomes } from '@/app/plugins/cbc/hooks/useCbcLessonPlanOutcomes';
import type { PlannedOutcome } from '@/app/core/types/lessonPlans';
import type { LessonPlanOutcomeSelectorProps } from '@/app/core/types/lessonPlanCurriculum';
import type { CbcLessonPlanOutcomeOption } from '@/app/plugins/cbc/types/cbc';

function snapshot(outcome: CbcLessonPlanOutcomeOption): PlannedOutcome {
    return {
        plugin: 'cbc', outcome_id: outcome.outcome_id, code: outcome.code, text: outcome.text,
        strand: outcome.strand.name, sub_strand: outcome.sub_strand.name,
        strand_id: outcome.strand.id, sub_strand_id: outcome.sub_strand.id,
        subject_profile_id: outcome.subject_profile.id,
    };
}

export function CbcLessonPlanOutcomeSelector({
    cohortSubjectId, value, onChange,
}: LessonPlanOutcomeSelectorProps) {
    const { data: outcomes = [], isLoading, error } = useCbcLessonPlanOutcomes(cohortSubjectId);
    const [strandId, setStrandId] = useState<number | ''>('');
    const [subStrandId, setSubStrandId] = useState<number | ''>('');
    const strands = useMemo(() => Array.from(new Map(outcomes.map((item) => [
        item.strand.id, { id: item.strand.id, name: item.strand.name },
    ])).values()), [outcomes]);
    const subStrands = useMemo(() => Array.from(new Map(outcomes
        .filter((item) => item.strand.id === strandId)
        .map((item) => [item.sub_strand.id, { id: item.sub_strand.id, name: item.sub_strand.name }])
    ).values()), [outcomes, strandId]);

    useEffect(() => {
        const first = value[0];
        if (first?.strand_id && first?.sub_strand_id) {
            setStrandId(first.strand_id);
            setSubStrandId(first.sub_strand_id);
        }
    }, [value]);
    useEffect(() => { setStrandId(''); setSubStrandId(''); onChange([]); }, [cohortSubjectId, onChange]);

    if (isLoading) return <LoadingSpinner message="Loading curriculum scope..." fullScreen={false} />;
    if (error) return <Card><p className="text-sm text-red-700">Curriculum scope could not be loaded.</p></Card>;
    return (
        <Card>
            <div className="space-y-4">
                <div>
                    <h2 className="font-semibold theme-text">Curriculum scope</h2>
                    <p className="mt-1 text-sm theme-muted">
                        Choose the strand and sub-strand. Curriculum alignment is resolved in the background; you do not need to select individual outcomes.
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Select label="Strand" value={strandId} options={[
                        { value: '', label: 'Choose a strand' },
                        ...strands.map((item) => ({ value: item.id, label: item.name })),
                    ]} onChange={(event) => { setStrandId(Number(event.target.value) || ''); setSubStrandId(''); onChange([]); }} />
                    <Select label="Sub-strand" value={subStrandId} disabled={strandId === ''} options={[
                        { value: '', label: strandId === '' ? 'Choose a strand first' : 'Choose a sub-strand' },
                        ...subStrands.map((item) => ({ value: item.id, label: item.name })),
                    ]} onChange={(event) => {
                        const selected = Number(event.target.value) || '';
                        setSubStrandId(selected);
                        onChange(selected === '' ? [] : outcomes
                            .filter((item) => item.strand.id === strandId && item.sub_strand.id === selected)
                            .map(snapshot));
                    }} />
                </div>
            </div>
        </Card>
    );
}

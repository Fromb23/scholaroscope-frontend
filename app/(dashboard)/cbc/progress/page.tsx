'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, Target, TrendingUp, Users, ChevronRight, Filter } from 'lucide-react';
import { useStrandsByCurriculum } from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useCohorts, useSubjects } from '@/app/core/hooks/useAcademic';
import {
    CBCNav, CBCError, CBCLoading, CBCEmpty, SubjectGroupPicker,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { Select } from '@/app/components/ui/Select';
import type { Cohort, Subject } from '@/app/core/types/academic';

export default function CBCProgressPage() {
    const {
        selectedCurriculumId, selectedSubjectId,
        setSelectedSubject, setSelectedCohort,
        selectedCohortId,
        allowedSubjectIds, allowedCohortIds,
        isAdmin, teachingLoading,
    } = useCBCContext();

    const { cohorts = [] } = useCohorts({ curriculum: selectedCurriculumId ?? undefined });
    const { subjects = [] } = useSubjects(selectedCurriculumId ?? undefined);
    const { data: strands = [], isLoading, error, refetch } =
        useStrandsByCurriculum(selectedCurriculumId);

    const subjectsForCurriculum = useMemo(() => {
        const all = subjects.filter((s: Subject) => s.curriculum === selectedCurriculumId);
        if (isAdmin || allowedSubjectIds === null) return all;
        return all.filter((s: Subject) => allowedSubjectIds.includes(s.id));
    }, [subjects, selectedCurriculumId, isAdmin, allowedSubjectIds]);

    const visibleCohorts = useMemo(() => {
        if (isAdmin || allowedCohortIds === null) return cohorts;
        return cohorts.filter((c: Cohort) => allowedCohortIds.includes(c.id));
    }, [cohorts, isAdmin, allowedCohortIds]);

    const visibleStrands = useMemo(() => {
        let result = strands;
        if (!isAdmin && allowedSubjectIds !== null) {
            result = result.filter(s => s.subject && allowedSubjectIds.includes(s.subject));
        }
        if (selectedSubjectId) {
            result = result.filter(s => s.subject === selectedSubjectId);
        }
        return result;
    }, [strands, selectedSubjectId, isAdmin, allowedSubjectIds]);

    const stats = useMemo(() => ({
        strands: visibleStrands.length,
        subStrands: visibleStrands.reduce((s, st) => s + st.sub_strands.length, 0),
        outcomes: visibleStrands.reduce(
            (s, st) => s + st.sub_strands.reduce((a, ss) => a + (ss.outcomes_count ?? 0), 0), 0
        ),
        subjects: new Set(visibleStrands.filter(s => s.subject).map(s => s.subject)).size,
    }), [visibleStrands]);

    if (teachingLoading) return <CBCLoading message="Loading your assignments…" />;

    if (!isAdmin && allowedSubjectIds?.length === 0) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <Card>
                    <CBCEmpty
                        icon={BookOpen}
                        title="No Subjects Assigned Yet"
                        description="Contact your administrator to get assigned to a cohort."
                    />
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />

            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">CBC Progress</h1>
                    <p className="text-gray-500 mt-1">Track competency emergence across outcomes</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <Filter className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900">Cohort</h3>
                        </div>
                        <Select
                            label=""
                            value={selectedCohortId?.toString() ?? ''}
                            onChange={e => setSelectedCohort(e.target.value ? Number(e.target.value) : null)}
                            options={[
                                { value: '', label: 'All cohorts' },
                                ...visibleCohorts.map((c: Cohort) => ({
                                    value: String(c.id), label: c.name,
                                })),
                            ]}
                        />
                    </Card>
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900">Subject</h3>
                        </div>
                        <SubjectGroupPicker
                            subjects={subjectsForCurriculum}
                            selectedSubjectId={selectedSubjectId}
                            onSelect={setSelectedSubject}
                        />
                    </Card>
                </div>

                {/* Content */}
                <div className="lg:col-span-3 space-y-4">
                    {selectedCurriculumId && !error && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatsCard title="Strands" value={stats.strands} icon={BookOpen} color="blue" />
                            <StatsCard title="Sub-Strands" value={stats.subStrands} icon={TrendingUp} color="green" />
                            <StatsCard title="Outcomes" value={stats.outcomes} icon={Target} color="purple" />
                            <StatsCard title="Subjects" value={stats.subjects} icon={Users} color="orange" />
                        </div>
                    )}

                    {error && <CBCError error={error} onRetry={refetch} />}

                    <Card>
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Target className="h-5 w-5 text-blue-600" />
                                Strands
                                {visibleStrands.length > 0 && (
                                    <Badge variant="blue" size="sm">{visibleStrands.length}</Badge>
                                )}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Click a strand to explore sub-strands and learning outcomes
                            </p>
                        </div>

                        {isLoading ? (
                            <CBCLoading message="Loading strands…" />
                        ) : visibleStrands.length === 0 ? (
                            <CBCEmpty icon={Target} title="No Strands Found"
                                description="No strands match the selected filters" />
                        ) : (
                            <div className="space-y-1">
                                {visibleStrands.map(strand => {
                                    const outcomeCount = strand.sub_strands.reduce(
                                        (s, ss) => s + (ss.outcomes_count ?? 0), 0
                                    );
                                    return (
                                        <Link
                                            key={strand.id}
                                            href={`/cbc/progress/strand/${strand.id}?cohort=${selectedCohortId ?? ''}`}
                                            className="flex items-center justify-between hover:bg-gray-50
                                                -mx-2 px-2 py-3 rounded-lg transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Badge variant="blue" size="sm" className="font-mono shrink-0">
                                                    {strand.code}
                                                </Badge>
                                                <span className="font-medium text-gray-900 truncate">
                                                    {strand.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <span className="text-sm text-gray-500">
                                                    {strand.sub_strands.length} sub-strands · {outcomeCount} outcomes
                                                </span>
                                                <ChevronRight className="h-5 w-5 text-gray-400
                                                    group-hover:text-blue-600 transition-colors" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
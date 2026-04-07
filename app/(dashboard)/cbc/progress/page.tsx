'use client';
// app/(dashboard)/cbc/progress/page.tsx

import { useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, Target, TrendingUp, Users, Filter, ChevronRight } from 'lucide-react';
import { useStrandsByCurriculum } from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import {
    CBCNav, CBCError, CBCLoading, CBCEmpty, StrandProgressRow,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';

export default function CBCProgressPage() {
    const { selectedCurriculumId, selectedSubjectId, setSelectedCurriculum, setSelectedSubject } =
        useCBCContext();
    const { curricula = [], subjects = [] } = useAcademic();

    const { data: strands = [], isLoading, error, refetch } = useStrandsByCurriculum(
        selectedCurriculumId
    );

    const subjectsForCurriculum = useMemo(
        () => subjects.filter((s: any) => s.curriculum === selectedCurriculumId),
        [subjects, selectedCurriculumId]
    );

    const visibleStrands = useMemo(() => {
        if (!selectedSubjectId) return strands;
        return strands.filter(s => s.subject === selectedSubjectId);
    }, [strands, selectedSubjectId]);

    const stats = useMemo(() => ({
        strands: visibleStrands.length,
        subStrands: visibleStrands.reduce((s, st) => s + st.sub_strands.length, 0),
        outcomes: visibleStrands.reduce(
            (s, st) => s + st.sub_strands.reduce((a, ss) => a + (ss.outcomes_count ?? 0), 0), 0
        ),
        subjects: new Set(visibleStrands.filter(s => s.subject).map(s => s.subject)).size,
    }), [visibleStrands]);

    return (
        <div className="space-y-6">
            <CBCNav />

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">CBC Progress</h1>
                    <p className="text-gray-500 mt-1">
                        Track competency-based curriculum coverage and outcomes
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">Filter</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                        label="Curriculum"
                        value={selectedCurriculumId?.toString() ?? ''}
                        onChange={e => setSelectedCurriculum(e.target.value ? Number(e.target.value) : null)}
                        options={[
                            { value: '', label: 'Select curriculum' },
                            ...curricula.map((c: any) => ({ value: String(c.id), label: c.name })),
                        ]}
                    />
                    <Select
                        label="Subject"
                        value={selectedSubjectId?.toString() ?? ''}
                        onChange={e => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
                        options={[
                            { value: '', label: 'All subjects' },
                            ...subjectsForCurriculum.map((s: any) => ({ value: String(s.id), label: s.name })),
                        ]}
                    />
                </div>
            </Card>

            {error && <CBCError error={error} onRetry={refetch} />}

            {/* Stats */}
            {selectedCurriculumId && !error && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatsCard title="Strands" value={stats.strands} icon={BookOpen} color="blue" />
                    <StatsCard title="Sub-Strands" value={stats.subStrands} icon={TrendingUp} color="green" />
                    <StatsCard title="Outcomes" value={stats.outcomes} icon={Target} color="purple" />
                    <StatsCard title="Subjects" value={stats.subjects} icon={Users} color="orange" />
                </div>
            )}

            {/* Strand list */}
            <Card>
                <div className="mb-5">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Strand Coverage
                        {visibleStrands.length > 0 && (
                            <Badge variant="blue" size="sm">{visibleStrands.length}</Badge>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Click a strand to explore its sub-strands and learning outcomes
                    </p>
                </div>

                {isLoading ? (
                    <CBCLoading />
                ) : !selectedCurriculumId ? (
                    <CBCEmpty icon={BookOpen} title="Select a Curriculum"
                        description="Choose a curriculum from the filters above" />
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
                                    href={`/cbc/browser/strands/${strand.id}`}
                                    className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg
                    transition-colors group"
                                >
                                    <div className="flex items-center">
                                        <div className="flex-1">
                                            <StrandProgressRow
                                                strandCode={strand.code}
                                                strandName={strand.name}
                                                totalOutcomes={outcomeCount}
                                                completedOutcomes={strand.sub_strands.length}
                                                percentage={0}
                                            />
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400
                      group-hover:text-blue-600 transition-colors ml-4 shrink-0" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Nav cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                    {
                        href: '/cbc/browser', icon: BookOpen, color: 'blue',
                        title: 'Curriculum Browser',
                        desc: 'Explore the full strand → sub-strand → outcome tree',
                    },
                    {
                        href: '/learners', icon: TrendingUp, color: 'emerald',
                        title: 'Learner Progress',
                        desc: 'View mastery levels per student or per cohort',
                    },
                ].map(({ href, icon: Icon, color, title, desc }) => (
                    <Link key={href} href={href} className="block group">
                        <Card className={`h-full hover:shadow-md hover:border-${color}-200 transition-all`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-3 bg-${color}-50 rounded-xl shrink-0`}>
                                    <Icon className={`h-6 w-6 text-${color}-600`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-semibold text-gray-900
                    group-hover:text-${color}-600 transition-colors mb-1`}>
                                        {title}
                                    </h3>
                                    <p className="text-sm text-gray-600">{desc}</p>
                                </div>
                                <ChevronRight className={`h-5 w-5 text-gray-400
                  group-hover:text-${color}-600 transition-colors shrink-0`} />
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Search, Layers } from 'lucide-react';
import { useStrands } from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import {
    CBCNav, CBCError, CBCLoading, CBCEmpty, SubjectGroupPicker,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';
import type { Subject } from '@/app/core/types/academic';
import { GuidedCohortSetupModal } from '@/app/plugins/cbc/components/GuidedCohortSetupModal';
import type { Strand } from '@/app/plugins/cbc/types/cbc';

export default function CBCBrowserPage() {
    const [setupStrand, setSetupStrand] = useState<Strand | null>(null);
    const {
        selectedCurriculumId, selectedSubjectId,
        setSelectedSubject, allowedSubjectIds,
        isAdmin, teachingLoading,
    } = useCBCContext();
    const [search, setSearch] = useState('');
    const { subjects = [] } = useAcademic();

    const { data: strands = [], isLoading, error, refetch } = useStrands(
        selectedCurriculumId
            ? {
                curriculum: selectedCurriculumId,
                ...(selectedSubjectId
                    ? { subject: selectedSubjectId }
                    : (!isAdmin && allowedSubjectIds?.length === 1)
                        ? { subject: allowedSubjectIds[0] }
                        : {}
                ),
            }
            : undefined
    );

    const subjectsForCurriculum = useMemo(() => {
        const all = subjects.filter((s: Subject) => s.curriculum === selectedCurriculumId);
        const filtered = isAdmin || allowedSubjectIds === null
            ? all
            : all.filter((s: Subject) => allowedSubjectIds.includes(s.id));

        const subjectIdsWithStrands = new Set(
            strands
                .filter(st => st.sub_strands_count > 0)
                .map(st => st.subject_org_id)
                .filter(Boolean)
        );
        return filtered.filter((s: Subject) => subjectIdsWithStrands.has(s.id));
    }, [subjects, selectedCurriculumId, isAdmin, allowedSubjectIds, strands]);

    const visible = useMemo(() => {
        let result = strands;

        if (!isAdmin && allowedSubjectIds !== null) {
            result = result.filter(s => s.subject_org_id && allowedSubjectIds.includes(s.subject_org_id));
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                s => s.code.toLowerCase().includes(q) ||
                    s.name.toLowerCase().includes(q) ||
                    s.description?.toLowerCase().includes(q)
            );
        }
        result = result.filter(s => s.sub_strands_count > 0);
        return result;
    }, [strands, search, isAdmin, allowedSubjectIds]);

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
                <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Curriculum Browser</h1>
                    <p className="text-gray-500 mt-1">Explore strands, sub-strands, and learning outcomes</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
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
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <Input
                                label=""
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search strands…"
                            />
                        </div>
                        {!isLoading && (
                            <p className="text-sm text-gray-500 whitespace-nowrap shrink-0">
                                <span className="font-semibold text-gray-900">{visible.length}</span>{' '}
                                strand{visible.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    {error && <CBCError error={error} onRetry={refetch} />}

                    {isLoading ? (
                        <CBCLoading message="Loading strands…" />
                    ) : visible.length === 0 ? (
                        <Card>
                            <CBCEmpty
                                icon={Search}
                                title="No Strands Found"
                                description="No strands match your current filters."
                            />
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {visible.map(strand => (
                                <Link key={strand.id} href={`/cbc/browser/strands/${strand.id}`} className="block group">
                                    <Card className="h-full hover:shadow-md hover:border-blue-200 transition-all duration-200">
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                                    <Badge variant="blue" size="md" className="font-mono shrink-0">
                                                        {strand.code}
                                                    </Badge>
                                                    {strand.subject_name && (
                                                        <Badge variant="purple" size="sm" className="truncate">
                                                            {strand.subject_name}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-gray-400
                                                    group-hover:text-blue-600 shrink-0 transition-colors" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2
                                                    group-hover:text-blue-600 transition-colors">
                                                    {strand.name}
                                                </h3>
                                                {strand.description && (
                                                    <p className="text-sm text-gray-600 line-clamp-2">
                                                        {strand.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-gray-100">
                                                <Layers className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    <span className="font-semibold text-gray-900">
                                                        {strand.sub_strands_count}
                                                    </span>
                                                    {' '}sub-strand{strand.sub_strands_count !== 1 ? 's' : ''}
                                                </span>
                                                {!strand.is_assigned && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); e.preventDefault(); setSetupStrand(strand); }}
                                                        className="ml-auto shrink-0"
                                                    >
                                                        <Badge variant="warning" size="sm" className="cursor-pointer hover:bg-yellow-100">
                                                            No cohort yet — fix
                                                        </Badge>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {setupStrand && (
                <GuidedCohortSetupModal
                    strand={setupStrand}
                    subjectLevel={setupStrand.subject_level ?? ''}
                    onComplete={refetch}
                    onClose={() => setSetupStrand(null)}
                />
            )}
        </div>
    );
}

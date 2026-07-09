'use client';

import { useEffect, useMemo, useState, type ComponentProps, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    AlertTriangle,
    Award,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Filter,
    Layers,
    Plus,
    TrendingUp,
} from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { useAssessments } from '@/app/core/hooks/useAssessments';
import { useAdminBulkFinalize } from '@/app/core/hooks/assessments/useAdminBulkFinalize';
import { useCurricula, useCurrentTerm, useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useCohortSubjectsByCohorts } from '@/app/core/hooks/useCohortSubjects';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { canCreateCurriculumWork, resolveCurriculumForType } from '@/app/core/lib/curriculumLifecycle';
import {
    canCreateTeachingRecord,
    canShowAdminMyTeaching,
    isSupervisionOnlyAdmin,
} from '@/app/core/lib/workspaces';
import { getReturnBackLabel } from '@/app/core/lib/workspaceReturn';
import {
    ASSESSMENT_TYPE_OPTIONS,
    AssessmentStatus,
    getAssessmentTypeLabel,
    type Assessment,
} from '@/app/core/types/assessment';
import type { AdminWorkViewMode } from '@/app/core/types/adminWorkViews';
import type { Term } from '@/app/core/types/academic';
import { useAuth } from '@/app/context/AuthContext';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

interface CohortOption {
    id: number;
    cohortId: number;
    label: string;
    cohortName: string;
}

interface CohortBucket {
    key: string;
    cohortId: number;
    label: string;
    items: Assessment[];
    stalledCount: number;
}

interface SubjectBucket {
    key: string;
    subjectId: number;
    label: string;
    cohorts: CohortBucket[];
    itemCount: number;
    stalledCount: number;
}

interface CategoryBucket {
    key: string;
    assessmentType: string;
    label: string;
    subjects: SubjectBucket[];
    itemCount: number;
    stalledCount: number;
}

interface TeachingGroup {
    key: string;
    label: string;
    description: string;
    items: Assessment[];
    stalledCount: number;
}

interface AssessmentOverviewPersistedState {
    selectedTerm?: number;
    viewMode?: AdminWorkViewMode;
    openCategories?: string[];
    openSubjects?: string[];
    openCohorts?: string[];
}

function parsePositiveId(value: string | null): number | undefined {
    const parsed = Number(value ?? '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePersistedPositiveId(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePersistedStringSet(value: unknown): Set<string> {
    if (!Array.isArray(value)) {
        return new Set();
    }
    return new Set(value.filter((entry): entry is string => typeof entry === 'string'));
}

function readAssessmentOverviewState(key: string): AssessmentOverviewPersistedState | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as AssessmentOverviewPersistedState;
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function isOpenNonFrozenTerm(term: Term): boolean {
    return term.status === 'OPEN' && !term.is_frozen;
}

function formatDate(value: string | null): string {
    return value ? new Date(value).toLocaleDateString() : '-';
}

function getEnteredEvidenceCount(assessment: Assessment): number {
    return assessment.entered_score_evidence_count ?? assessment.scores_count ?? 0;
}

function isStalledAssessment(assessment: Assessment): boolean {
    return assessment.status === AssessmentStatus.ACTIVE && getEnteredEvidenceCount(assessment) === 0;
}

function getEvaluationBadge(type: string): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
        NUMERIC: 'blue',
        RUBRIC: 'purple',
        DESCRIPTIVE: 'green',
        COMPETENCY: 'orange',
    };
    return variants[type] || 'default';
}

function getStatusBadge(status: AssessmentStatus): BadgeVariant {
    if (status === AssessmentStatus.FINALIZED) return 'green';
    if (status === AssessmentStatus.ACTIVE) return 'blue';
    return 'default';
}

function sortAssessments(items: Assessment[]): Assessment[] {
    return [...items].sort((left, right) => {
        const dateCompare = (right.assessment_date ?? '').localeCompare(left.assessment_date ?? '');
        return dateCompare || left.name.localeCompare(right.name);
    });
}

function toggleKey(setter: Dispatch<SetStateAction<Set<string>>>, key: string) {
    setter((previous) => {
        const next = new Set(previous);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        return next;
    });
}

function TermSelector({
    terms,
    selectedTerm,
    onChange,
    required,
}: {
    terms: Term[];
    selectedTerm: number | undefined;
    onChange: (termId: number | undefined) => void;
    required: boolean;
}) {
    return (
        <Select
            label="Term"
            required={required}
            value={selectedTerm?.toString() || ''}
            onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
            options={[
                { value: '', label: required ? 'Select term' : 'All terms' },
                ...terms.map((term) => ({
                    value: String(term.id),
                    label: `${term.academic_year_name} - ${term.name}`,
                })),
            ]}
        />
    );
}

function BulkFinalizeAssessmentAction({
    termId,
    termName,
    categoryType,
    categoryLabel,
    stalledCount,
    onSuccess,
}: {
    termId: number;
    termName: string;
    categoryType: string;
    categoryLabel: string;
    stalledCount: number;
    onSuccess: () => Promise<void> | void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [finalizeUnresolvedAbsent, setFinalizeUnresolvedAbsent] = useState(false);
    const { bulkFinalize, loading, error, result, reset } = useAdminBulkFinalize({ onSuccess });

    const close = () => {
        setIsOpen(false);
        setFinalizeUnresolvedAbsent(false);
        reset();
    };

    const confirm = async () => {
        try {
            await bulkFinalize({
                term_id: termId,
                assessment_type: categoryType,
                finalize_unresolved_absent: finalizeUnresolvedAbsent,
            });
        } catch {
            // Error state is owned by the hook and rendered in this modal.
        }
    };

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen(true);
                }}
            >
                <CheckCircle2 className="h-4 w-4" />
                Finalize category
            </Button>
            <Modal isOpen={isOpen} onClose={close} title="Finalize assessment category" size="md">
                <div className="space-y-5">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-900">Scope</p>
                        <p className="mt-1 text-sm text-gray-600">
                            {termName} {' › '} {categoryLabel}
                        </p>
                        {stalledCount > 0 ? (
                            <p className="mt-3 flex items-center gap-2 text-sm text-amber-700">
                                <AlertTriangle className="h-4 w-4" />
                                {stalledCount} active assessment{stalledCount === 1 ? '' : 's'} have no entered score evidence.
                            </p>
                        ) : null}
                    </div>

                    <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-gray-300"
                            checked={finalizeUnresolvedAbsent}
                            onChange={(event) => setFinalizeUnresolvedAbsent(event.target.checked)}
                        />
                        <span>Finalize unresolved missed learners as absent</span>
                    </label>

                    {error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    ) : null}

                    {result ? (
                        <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-green-700">Finalized</p>
                                    <p className="text-lg font-semibold text-green-900">{result.finalized_count}</p>
                                </div>
                                <div>
                                    <p className="text-green-700">Skipped</p>
                                    <p className="text-lg font-semibold text-green-900">{result.skipped_count}</p>
                                </div>
                            </div>
                            {result.skipped.length > 0 ? (
                                <div className="max-h-40 space-y-2 overflow-y-auto text-sm">
                                    {result.skipped.map((item) => (
                                        <div key={item.id} className="rounded border border-green-200 bg-white px-3 py-2">
                                            <p className="font-medium text-gray-900">{item.name}</p>
                                            <p className="text-gray-600">{item.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={close}>
                            {result ? 'Close' : 'Cancel'}
                        </Button>
                        {!result ? (
                            <Button type="button" onClick={() => void confirm()} disabled={loading}>
                                {loading ? 'Finalizing...' : 'Confirm finalization'}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </Modal>
        </>
    );
}

function AssessmentLeafRow({
    assessment,
    breadcrumb,
}: {
    assessment: Assessment;
    breadcrumb: string;
}) {
    const router = useRouter();
    const stalled = isStalledAssessment(assessment);

    return (
        <TableRow
            key={assessment.id}
            onClick={() => router.push(`/assessments/${assessment.id}`)}
            className={stalled ? 'bg-amber-50/60' : undefined}
        >
            <TableCell>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">{assessment.name}</span>
                        {stalled ? (
                            <Badge variant="orange">Stalled</Badge>
                        ) : null}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{breadcrumb}</p>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant={getStatusBadge(assessment.status)}>{assessment.status_display}</Badge>
            </TableCell>
            <TableCell>
                <Badge variant={getEvaluationBadge(assessment.evaluation_type)}>
                    {assessment.evaluation_type_display}
                </Badge>
            </TableCell>
            <TableCell>
                <span className="text-sm text-gray-600">{formatDate(assessment.assessment_date)}</span>
            </TableCell>
            <TableCell>
                <span className="text-sm text-gray-700">
                    {getEnteredEvidenceCount(assessment)} / {assessment.scores_count}
                </span>
            </TableCell>
            <TableCell>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/assessments/${assessment.id}`);
                    }}
                >
                    View details
                </Button>
            </TableCell>
        </TableRow>
    );
}

function AssessmentCohortGroup({
    cohort,
    termName,
    categoryLabel,
    subjectLabel,
    isOpen,
    onToggle,
}: {
    cohort: CohortBucket;
    termName: string;
    categoryLabel: string;
    subjectLabel: string;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-gray-200">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-left"
            >
                <div className="flex min-w-0 items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{cohort.label}</p>
                        <p className="text-xs text-gray-500">
                            {cohort.items.length} assessment{cohort.items.length === 1 ? '' : 's'}
                        </p>
                    </div>
                </div>
                {cohort.stalledCount > 0 ? (
                    <Badge variant="orange">{cohort.stalledCount} stalled</Badge>
                ) : null}
            </button>
            {isOpen ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Assessment</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Evaluation</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Evidence</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cohort.items.map((assessment) => (
                            <AssessmentLeafRow
                                key={assessment.id}
                                assessment={assessment}
                                breadcrumb={`${termName} › ${categoryLabel} › ${subjectLabel} › ${cohort.label}`}
                            />
                        ))}
                    </TableBody>
                </Table>
            ) : null}
        </div>
    );
}

function AssessmentSubjectGroup({
    subject,
    termName,
    categoryLabel,
    openCohorts,
    onToggleSubject,
    onToggleCohort,
    isOpen,
}: {
    subject: SubjectBucket;
    termName: string;
    categoryLabel: string;
    openCohorts: Set<string>;
    onToggleSubject: () => void;
    onToggleCohort: (key: string) => void;
    isOpen: boolean;
}) {
    return (
        <div className="rounded-lg border border-gray-200">
            <button
                type="button"
                onClick={onToggleSubject}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
                <div className="flex min-w-0 items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />}
                    <BookOpen className="h-4 w-4 shrink-0 text-gray-500" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{subject.label}</p>
                        <p className="text-xs text-gray-500">
                            {subject.itemCount} assessment{subject.itemCount === 1 ? '' : 's'} in {subject.cohorts.length} cohort{subject.cohorts.length === 1 ? '' : 's'}
                        </p>
                    </div>
                </div>
                {subject.stalledCount > 0 ? (
                    <Badge variant="orange">{subject.stalledCount} stalled</Badge>
                ) : null}
            </button>
            {isOpen ? (
                <div className="space-y-3 border-t border-gray-200 p-3">
                    {subject.cohorts.map((cohort) => (
                        <AssessmentCohortGroup
                            key={cohort.key}
                            cohort={cohort}
                            termName={termName}
                            categoryLabel={categoryLabel}
                            subjectLabel={subject.label}
                            isOpen={openCohorts.has(cohort.key)}
                            onToggle={() => onToggleCohort(cohort.key)}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function AssessmentCategoryAccordion({
    category,
    termId,
    termName,
    isOpen,
    openSubjects,
    openCohorts,
    onToggleCategory,
    onToggleSubject,
    onToggleCohort,
    onBulkSuccess,
}: {
    category: CategoryBucket;
    termId: number;
    termName: string;
    isOpen: boolean;
    openSubjects: Set<string>;
    openCohorts: Set<string>;
    onToggleCategory: () => void;
    onToggleSubject: (key: string) => void;
    onToggleCohort: (key: string) => void;
    onBulkSuccess: () => Promise<void> | void;
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="flex flex-col gap-3 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <button
                    type="button"
                    onClick={onToggleCategory}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                    {isOpen ? <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" /> : <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />}
                    <Layers className="h-5 w-5 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-gray-900">{category.label}</h3>
                            {category.stalledCount > 0 ? (
                                <Badge variant="orange">{category.stalledCount} stalled</Badge>
                            ) : null}
                        </div>
                        <p className="text-xs text-gray-500">
                            {termName} {' › '} {category.label} - {category.itemCount} assessment{category.itemCount === 1 ? '' : 's'}
                        </p>
                    </div>
                </button>
                <BulkFinalizeAssessmentAction
                    termId={termId}
                    termName={termName}
                    categoryType={category.assessmentType}
                    categoryLabel={category.label}
                    stalledCount={category.stalledCount}
                    onSuccess={onBulkSuccess}
                />
            </div>
            {isOpen ? (
                <div className="space-y-3 border-t border-gray-200 bg-gray-50 p-3">
                    {category.subjects.map((subject) => (
                        <AssessmentSubjectGroup
                            key={subject.key}
                            subject={subject}
                            termName={termName}
                            categoryLabel={category.label}
                            isOpen={openSubjects.has(subject.key)}
                            openCohorts={openCohorts}
                            onToggleSubject={() => onToggleSubject(subject.key)}
                            onToggleCohort={onToggleCohort}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function TeachingAssessmentGroups({
    groups,
}: {
    groups: TeachingGroup[];
}) {
    if (groups.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4 p-4">
            {groups.map((group) => (
                <div key={group.key} className="overflow-hidden rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-3">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">{group.label}</h3>
                            <p className="text-sm text-gray-500">{group.description}</p>
                        </div>
                        {group.stalledCount > 0 ? (
                            <Badge variant="orange">{group.stalledCount} stalled</Badge>
                        ) : null}
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Assessment</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Evidence</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {group.items.map((assessment) => (
                                <AssessmentLeafRow
                                    key={assessment.id}
                                    assessment={assessment}
                                    breadcrumb={`${assessment.term_name ?? 'No term'} › ${getAssessmentTypeLabel(assessment.assessment_type)} › ${assessment.subject_name} › ${assessment.cohort_name}`}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ))}
        </div>
    );
}

export function AssessmentsOverview() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeOrg, user, activeRole, capabilities } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const isAdminLike = Boolean(user?.is_superadmin) || activeRole === 'ADMIN';
    const canUseMyTeaching = isInstructor || canShowAdminMyTeaching({
        role: activeRole,
        orgType: activeOrg?.org_type,
        isSuperadmin: user?.is_superadmin,
        capabilities,
    });
    const canCreateTeachingRecords = canCreateTeachingRecord({
        role: activeRole,
        orgType: activeOrg?.org_type,
        isSuperadmin: user?.is_superadmin,
        capabilities,
    });
    const supervisionOnlyAdmin = isSupervisionOnlyAdmin({
        role: activeRole,
        orgType: activeOrg?.org_type,
        isSuperadmin: user?.is_superadmin,
        capabilities,
    });
    const [viewMode, setViewMode] = useState<AdminWorkViewMode>('admin_supervision');
    const [selectedTerm, setSelectedTerm] = useState<number | undefined>();
    const [selectedCohort, setSelectedCohort] = useState<number | undefined>();
    const [selectedCohortSubject, setSelectedCohortSubject] = useState<number | undefined>();
    const [selectedType, setSelectedType] = useState<string | undefined>();
    const [selectedEvalType, setSelectedEvalType] = useState<string | undefined>();
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
    const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set());
    const [openCohorts, setOpenCohorts] = useState<Set<string>>(new Set());
    const [persistedTermCandidate, setPersistedTermCandidate] = useState<number | undefined>();
    const [hydratedPersistenceKey, setHydratedPersistenceKey] = useState<string | null>(null);
    const [hasPersistedAccordionState, setHasPersistedAccordionState] = useState(false);
    const instructorAccess = useInstructorCohortAccess();
    const isTeachingActor = instructorAccess.isTeachingActor;
    const isSelfManagedTeachingAdmin = instructorAccess.isSelfManagedTeachingAdmin;
    const showInstitutionSupervision = isAdminLike && !isSelfManagedTeachingAdmin;
    const effectiveMyTeachingMode = isTeachingActor || (canUseMyTeaching && viewMode === 'my_teaching');
    const isAdminSupervisionMode = showInstitutionSupervision && !effectiveMyTeachingMode;
    const safeReturnTo = useMemo(() => {
        const value = searchParams.get('returnTo');
        return value?.startsWith('/') ? value : null;
    }, [searchParams]);
    const source = searchParams.get('source');
    const queryTerm = useMemo(() => parsePositiveId(searchParams.get('term')), [searchParams]);
    const activeOrgId = activeOrg?.id;
    const userId = user?.id;
    const persistenceKey = useMemo(() => {
        if (!activeOrgId || !userId || !activeRole) {
            return null;
        }
        return `scholaroscope:assessments:${activeOrgId}:${userId}:${activeRole}`;
    }, [activeOrgId, activeRole, userId]);
    const { curricula } = useCurricula();
    const { cohorts } = useCohorts();
    const cohortIds = useMemo(() => cohorts.map((cohort) => cohort.id), [cohorts]);
    const { subjects: cohortSubjects } = useCohortSubjectsByCohorts(cohortIds);
    const { currentTerm } = useCurrentTerm();
    const { terms } = useTerms();
    const hasWritableAssessmentCurriculum = useMemo(() => {
        if (isAdminLike) {
            return curricula.some((curriculum) => canCreateCurriculumWork(curriculum));
        }

        return instructorAccess.assignments.some((assignment) => {
            const curriculum = typeof assignment.curriculum_id === 'number'
                ? (curricula.find((entry) => entry.id === assignment.curriculum_id) ?? null)
                : resolveCurriculumForType(curricula, assignment.curriculum_type ?? null);
            return canCreateCurriculumWork(curriculum);
        });
    }, [curricula, instructorAccess.assignments, isAdminLike]);
    const canCreateAssessment = hasWritableAssessmentCurriculum && (
        canCreateTeachingRecords || (isTeachingActor && instructorAccess.hasAssignedCohortSubjects)
    );
    const createButtonLabel = effectiveMyTeachingMode
        ? 'Create my assessment'
        : 'Create assessment';

    useEffect(() => {
        if (!persistenceKey) {
            setPersistedTermCandidate(undefined);
            setHydratedPersistenceKey(null);
            setHasPersistedAccordionState(false);
            setSelectedTerm(undefined);
            return;
        }

        const persisted = readAssessmentOverviewState(persistenceKey);
        const persistedViewMode = persisted?.viewMode;
        setSelectedTerm(undefined);
        if (
            persistedViewMode === 'admin_supervision'
            || persistedViewMode === 'my_teaching'
        ) {
            setViewMode(persistedViewMode);
        } else {
            setViewMode('admin_supervision');
        }
        setPersistedTermCandidate(parsePersistedPositiveId(persisted?.selectedTerm));
        setOpenCategories(parsePersistedStringSet(persisted?.openCategories));
        setOpenSubjects(parsePersistedStringSet(persisted?.openSubjects));
        setOpenCohorts(parsePersistedStringSet(persisted?.openCohorts));
        setHasPersistedAccordionState(Boolean(
            persisted
            && (
                Array.isArray(persisted.openCategories)
                || Array.isArray(persisted.openSubjects)
                || Array.isArray(persisted.openCohorts)
            )
        ));
        setHydratedPersistenceKey(persistenceKey);
    }, [persistenceKey]);

    useEffect(() => {
        if (isSelfManagedTeachingAdmin && viewMode !== 'my_teaching') {
            setViewMode('my_teaching');
            return;
        }
        if (!canUseMyTeaching && viewMode === 'my_teaching') {
            setViewMode('admin_supervision');
        }
    }, [canUseMyTeaching, isSelfManagedTeachingAdmin, viewMode]);

    const validTermIds = useMemo(
        () => new Set(terms.map((term) => term.id)),
        [terms]
    );
    const firstOpenTermId = useMemo(
        () => terms.find(isOpenNonFrozenTerm)?.id,
        [terms]
    );

    useEffect(() => {
        const queryCohort = parsePositiveId(searchParams.get('cohort'));
        const queryCohortSubject = parsePositiveId(searchParams.get('cohort_subject'));

        if (queryCohort !== undefined) {
            setSelectedCohort(queryCohort);
        }
        if (queryCohortSubject !== undefined) {
            setSelectedCohortSubject(queryCohortSubject);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!persistenceKey || hydratedPersistenceKey !== persistenceKey) {
            return;
        }

        if (terms.length === 0) {
            setSelectedTerm(undefined);
            return;
        }

        if (queryTerm !== undefined && validTermIds.has(queryTerm)) {
            setSelectedTerm(queryTerm);
            return;
        }

        if (selectedTerm !== undefined && validTermIds.has(selectedTerm)) {
            return;
        }

        const persistedTerm = (
            persistedTermCandidate !== undefined
            && validTermIds.has(persistedTermCandidate)
        )
            ? persistedTermCandidate
            : undefined;
        const currentTermId = (
            currentTerm?.id !== undefined
            && validTermIds.has(currentTerm.id)
        )
            ? currentTerm.id
            : undefined;

        if (isAdminSupervisionMode) {
            setSelectedTerm(persistedTerm ?? currentTermId ?? firstOpenTermId);
        } else {
            setSelectedTerm(persistedTerm);
        }
    }, [
        currentTerm?.id,
        firstOpenTermId,
        hydratedPersistenceKey,
        isAdminSupervisionMode,
        persistedTermCandidate,
        persistenceKey,
        queryTerm,
        selectedTerm,
        terms.length,
        validTermIds,
    ]);

    useEffect(() => {
        if (!isAdminSupervisionMode || !persistenceKey || hydratedPersistenceKey !== persistenceKey) {
            return;
        }

        const params = new URLSearchParams(searchParams.toString());
        const currentQueryTerm = parsePositiveId(params.get('term'));
        if (selectedTerm !== undefined) {
            if (currentQueryTerm === selectedTerm) {
                return;
            }
            params.set('term', String(selectedTerm));
        } else {
            if (currentQueryTerm === undefined) {
                return;
            }
            params.delete('term');
        }

        const nextQuery = params.toString();
        router.replace(nextQuery ? `/assessments?${nextQuery}` : '/assessments', { scroll: false });
    }, [
        hydratedPersistenceKey,
        isAdminSupervisionMode,
        persistenceKey,
        router,
        searchParams,
        selectedTerm,
    ]);

    useEffect(() => {
        if (!persistenceKey || hydratedPersistenceKey !== persistenceKey || typeof window === 'undefined') {
            return;
        }

        const payload: AssessmentOverviewPersistedState = {
            selectedTerm,
            viewMode,
            openCategories: Array.from(openCategories),
            openSubjects: Array.from(openSubjects),
            openCohorts: Array.from(openCohorts),
        };
        window.localStorage.setItem(persistenceKey, JSON.stringify(payload));
    }, [
        hydratedPersistenceKey,
        openCategories,
        openCohorts,
        openSubjects,
        persistenceKey,
        selectedTerm,
        viewMode,
    ]);

    const shouldFetchAssessments = !isAdminSupervisionMode || Boolean(selectedTerm);
    const {
        assessments,
        loading,
        refetch: refetchAssessments,
    } = useAssessments({
        term: selectedTerm,
        cohort_subject: isAdminSupervisionMode ? undefined : selectedCohortSubject,
        assessment_type: isAdminSupervisionMode ? undefined : selectedType,
        evaluation_type: isAdminSupervisionMode ? undefined : selectedEvalType,
        enabled: shouldFetchAssessments,
    });

    const createAssessmentHref = useMemo(() => {
        const params = new URLSearchParams();
        if (selectedCohort) {
            params.set('cohort', String(selectedCohort));
        }
        if (selectedCohortSubject) {
            params.set('cohort_subject', String(selectedCohortSubject));
        }
        if (source) {
            params.set('source', source);
        } else if (selectedCohortSubject) {
            params.set('source', 'cohort_subject');
        }
        params.set('returnTo', `${'/assessments'}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
        return `/assessments/new?${params.toString()}`;
    }, [searchParams, selectedCohort, selectedCohortSubject, source]);
    const backLabel = source === 'cohort_subject'
        ? 'Back to workspace'
        : getReturnBackLabel(safeReturnTo);

    const availableCohortSubjects = useMemo<CohortOption[]>(() => {
        if (isTeachingActor) {
            const items = instructorAccess.assignments
                .filter((assignment) => (
                    typeof assignment.cohort_subject_id === 'number'
                    && typeof assignment.cohort_id === 'number'
                ))
                .map((assignment) => ({
                    id: assignment.cohort_subject_id as number,
                    cohortId: assignment.cohort_id as number,
                    label: `${assignment.subject_code ?? assignment.subject_name} - ${assignment.subject_name}`,
                    cohortName: assignment.cohort_name,
                }));

            return Array.from(new Map(items.map((item) => [item.id, item])).values())
                .filter((item) => !selectedCohort || item.cohortId === selectedCohort)
                .sort((left, right) => left.label.localeCompare(right.label));
        }

        return cohortSubjects
            .filter((subject) => typeof subject.cohort_id === 'number')
            .map((subject) => ({
                id: subject.id,
                cohortId: subject.cohort_id as number,
                label: `${subject.subject_code} - ${subject.subject_name}`,
                cohortName: subject.cohort_name,
            }))
            .filter((subject) => !selectedCohort || subject.cohortId === selectedCohort)
            .sort((left, right) => left.label.localeCompare(right.label));
    }, [cohortSubjects, instructorAccess.assignments, isTeachingActor, selectedCohort]);

    const visibleAssessments = useMemo(() => assessments.filter((assessment) => {
        if (!isAdminSupervisionMode && selectedCohort && assessment.cohort_id !== selectedCohort) {
            return false;
        }

        if (isAdminLike && effectiveMyTeachingMode) {
            return assessment.created_by === user?.id;
        }

        return true;
    }), [assessments, effectiveMyTeachingMode, isAdminLike, isAdminSupervisionMode, selectedCohort, user?.id]);

    const selectedTermRecord = useMemo(
        () => terms.find((term) => term.id === selectedTerm),
        [selectedTerm, terms]
    );
    const selectedTermName = selectedTermRecord
        ? `${selectedTermRecord.academic_year_name} - ${selectedTermRecord.name}`
        : 'Selected term';

    const hierarchy = useMemo<CategoryBucket[]>(() => {
        const categoryOrder = new Map<string, number>(
            ASSESSMENT_TYPE_OPTIONS.map((option, index) => [option.value, index])
        );
        const categories = new Map<string, {
            assessmentType: string;
            label: string;
            subjects: Map<string, {
                subjectId: number;
                label: string;
                cohorts: Map<string, {
                    cohortId: number;
                    label: string;
                    items: Assessment[];
                }>;
            }>;
        }>();

        visibleAssessments.forEach((assessment) => {
            const categoryType = assessment.assessment_type;
            const categoryLabel = getAssessmentTypeLabel(categoryType);
            const subjectKey = `${categoryType}:subject:${assessment.subject_id}`;
            const cohortKey = `${subjectKey}:cohort:${assessment.cohort_id}`;

            if (!categories.has(categoryType)) {
                categories.set(categoryType, {
                    assessmentType: categoryType,
                    label: categoryLabel,
                    subjects: new Map(),
                });
            }
            const category = categories.get(categoryType);
            if (!category) return;

            if (!category.subjects.has(subjectKey)) {
                category.subjects.set(subjectKey, {
                    subjectId: assessment.subject_id,
                    label: `${assessment.subject_code} - ${assessment.subject_name}`,
                    cohorts: new Map(),
                });
            }
            const subject = category.subjects.get(subjectKey);
            if (!subject) return;

            if (!subject.cohorts.has(cohortKey)) {
                subject.cohorts.set(cohortKey, {
                    cohortId: assessment.cohort_id,
                    label: assessment.cohort_name,
                    items: [],
                });
            }
            subject.cohorts.get(cohortKey)?.items.push(assessment);
        });

        return Array.from(categories.entries())
            .map(([key, category]) => {
                const subjects = Array.from(category.subjects.entries())
                    .map(([subjectKey, subject]) => {
                        const cohorts = Array.from(subject.cohorts.entries())
                            .map(([cohortKey, cohort]) => {
                                const items = sortAssessments(cohort.items);
                                return {
                                    key: cohortKey,
                                    cohortId: cohort.cohortId,
                                    label: cohort.label,
                                    items,
                                    stalledCount: items.filter(isStalledAssessment).length,
                                };
                            })
                            .sort((left, right) => left.label.localeCompare(right.label));
                        const itemCount = cohorts.reduce((sum, cohort) => sum + cohort.items.length, 0);
                        const stalledCount = cohorts.reduce((sum, cohort) => sum + cohort.stalledCount, 0);
                        return {
                            key: subjectKey,
                            subjectId: subject.subjectId,
                            label: subject.label,
                            cohorts,
                            itemCount,
                            stalledCount,
                        };
                    })
                    .sort((left, right) => left.label.localeCompare(right.label));
                const itemCount = subjects.reduce((sum, subject) => sum + subject.itemCount, 0);
                const stalledCount = subjects.reduce((sum, subject) => sum + subject.stalledCount, 0);
                return {
                    key,
                    assessmentType: category.assessmentType,
                    label: category.label,
                    subjects,
                    itemCount,
                    stalledCount,
                };
            })
            .sort((left, right) => {
                const leftOrder = categoryOrder.get(left.assessmentType) ?? Number.MAX_SAFE_INTEGER;
                const rightOrder = categoryOrder.get(right.assessmentType) ?? Number.MAX_SAFE_INTEGER;
                return leftOrder - rightOrder || left.label.localeCompare(right.label);
            });
    }, [visibleAssessments]);

    useEffect(() => {
        if (!isAdminSupervisionMode || hierarchy.length === 0 || hasPersistedAccordionState) {
            return;
        }
        setOpenCategories((previous) => {
            if (previous.size > 0) return previous;
            return new Set([hierarchy[0].key]);
        });
    }, [hasPersistedAccordionState, hierarchy, isAdminSupervisionMode]);

    const teachingGroups = useMemo<TeachingGroup[]>(() => {
        const groups = new Map<string, { label: string; description: string; items: Assessment[] }>();
        visibleAssessments.forEach((assessment) => {
            const key = `${assessment.cohort_id}:${assessment.subject_id}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    label: `${assessment.cohort_name} - ${assessment.subject_code}`,
                    description: assessment.subject_name,
                    items: [],
                });
            }
            groups.get(key)?.items.push(assessment);
        });

        return Array.from(groups.entries())
            .map(([key, group]) => {
                const items = sortAssessments(group.items);
                return {
                    key,
                    label: group.label,
                    description: group.description,
                    items,
                    stalledCount: items.filter(isStalledAssessment).length,
                };
            })
            .sort((left, right) => left.label.localeCompare(right.label));
    }, [visibleAssessments]);

    const assessmentTypes = [
        { value: '', label: 'All types' },
        ...ASSESSMENT_TYPE_OPTIONS,
    ];

    const evaluationTypes = [
        { value: '', label: 'All evaluation types' },
        { value: 'NUMERIC', label: 'Numeric' },
        { value: 'RUBRIC', label: 'Rubric' },
        { value: 'DESCRIPTIVE', label: 'Descriptive' },
        { value: 'COMPETENCY', label: 'Competency' },
    ];

    const totalAssessments = visibleAssessments.length;
    const activeAssessments = visibleAssessments.filter((assessment) => assessment.status === AssessmentStatus.ACTIVE).length;
    const finalizedAssessments = visibleAssessments.filter((assessment) => assessment.status === AssessmentStatus.FINALIZED).length;
    const stalledAssessments = visibleAssessments.filter(isStalledAssessment).length;
    const totalEvidence = visibleAssessments.reduce((sum, assessment) => sum + getEnteredEvidenceCount(assessment), 0);

    const assistantContext = useMemo(() => ({
        pageKey: 'assessments_overview',
        pageTitle: effectiveMyTeachingMode ? 'Assessments & Grading' : 'Assessment Overview',
        state: {
            is_loading: loading,
            total_assessments: totalAssessments,
            no_results: !loading && visibleAssessments.length === 0,
            can_create_assessment: canCreateAssessment,
            has_assigned_cohort_subjects: instructorAccess.hasAssignedCohortSubjects,
            selected_term: selectedTerm ?? null,
        },
        visibleActions: [
            ...(canCreateAssessment
                ? [{ label: createButtonLabel, type: 'navigate' as const, href: createAssessmentHref }]
                : []),
            ...(supervisionOnlyAdmin
                ? [
                    { label: 'View instructor activity', type: 'navigate' as const, href: '/admin/instructors' },
                    { label: 'Open reports', type: 'navigate' as const, href: '/reports' },
                ]
                : []),
        ],
        nextSafeAction: canCreateAssessment
            ? { label: createButtonLabel, type: 'navigate' as const, href: createAssessmentHref }
            : supervisionOnlyAdmin
                ? { label: 'View instructor activity', type: 'navigate' as const, href: '/admin/instructors' }
            : undefined,
        workflowStep: 'assessment_overview',
        emptyStateReason: !loading && visibleAssessments.length === 0
            ? isAdminSupervisionMode && !selectedTerm
                ? 'Select a term to view assessments.'
                : 'No assessments are visible with the current filters.'
            : undefined,
    }), [
        canCreateAssessment,
        createAssessmentHref,
        createButtonLabel,
        effectiveMyTeachingMode,
        instructorAccess.hasAssignedCohortSubjects,
        isAdminSupervisionMode,
        loading,
        selectedTerm,
        supervisionOnlyAdmin,
        totalAssessments,
        visibleAssessments.length,
    ]);

    useAssistantPageContext(assistantContext);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        {isTeachingActor ? 'Assessments & Grading' : effectiveMyTeachingMode ? 'My Assessments' : 'Assessment Overview'}
                    </h1>
                    <p className="mt-1 text-gray-600">
                        {effectiveMyTeachingMode
                            ? 'Create, review, and grade assigned assessment work.'
                            : 'Supervise assessments by term, category, subject, and cohort.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {safeReturnTo ? (
                        <Link href={safeReturnTo}>
                            <Button variant="ghost" size="sm">{backLabel}</Button>
                        </Link>
                    ) : null}
                    {canCreateAssessment ? (
                        <Link href={createAssessmentHref}>
                            <Button>
                                <Plus className="h-4 w-4" />
                                {createButtonLabel}
                            </Button>
                        </Link>
                    ) : supervisionOnlyAdmin ? (
                        <Link href="/admin/instructors">
                            <Button variant="secondary">View instructor activity</Button>
                        </Link>
                    ) : null}
                </div>
            </div>

            {showInstitutionSupervision ? (
                <Card>
                    <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Workspace mode</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Admin supervision uses the confirmed assessment hierarchy.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant={viewMode === 'admin_supervision' ? 'secondary' : 'ghost'}
                                onClick={() => setViewMode('admin_supervision')}
                            >
                                Admin supervision
                            </Button>
                            {canUseMyTeaching ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={viewMode === 'my_teaching' ? 'secondary' : 'ghost'}
                                    onClick={() => setViewMode('my_teaching')}
                                >
                                    My Teaching
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </Card>
            ) : null}

            <Card>
                <div className="space-y-4 p-4">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <Filter className="h-5 w-5 text-gray-400" />
                        <span>{isAdminSupervisionMode ? 'Select a term to load the assessment hierarchy.' : 'Filter assessment work.'}</span>
                    </div>
                    {isAdminSupervisionMode ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <TermSelector
                                terms={terms}
                                selectedTerm={selectedTerm}
                                onChange={setSelectedTerm}
                                required
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                            <TermSelector
                                terms={terms}
                                selectedTerm={selectedTerm}
                                onChange={setSelectedTerm}
                                required={false}
                            />
                            <Select
                                label="Class"
                                value={selectedCohort?.toString() || ''}
                                onChange={(event) => setSelectedCohort(event.target.value ? Number(event.target.value) : undefined)}
                                options={[
                                    { value: '', label: 'All classes' },
                                    ...cohorts.map((cohort) => ({ value: String(cohort.id), label: cohort.name })),
                                ]}
                            />
                            <Select
                                label="Cohort subject"
                                value={selectedCohortSubject?.toString() || ''}
                                onChange={(event) => setSelectedCohortSubject(event.target.value ? Number(event.target.value) : undefined)}
                                options={[
                                    { value: '', label: 'All cohort subjects' },
                                    ...availableCohortSubjects.map((subject) => ({
                                        value: String(subject.id),
                                        label: `${subject.label}${subject.cohortName ? ` (${subject.cohortName})` : ''}`,
                                    })),
                                ]}
                            />
                            <Select
                                label="Assessment type"
                                value={selectedType || ''}
                                onChange={(event) => setSelectedType(event.target.value || undefined)}
                                options={assessmentTypes}
                            />
                            <Select
                                label="Evaluation"
                                value={selectedEvalType || ''}
                                onChange={(event) => setSelectedEvalType(event.target.value || undefined)}
                                options={evaluationTypes}
                            />
                        </div>
                    )}
                </div>
            </Card>

            <StatStrip mdColumns={4} gap="wide">
                <StatsCard title="Total Assessments" value={totalAssessments} icon={ClipboardList} color="blue" mobile="hide" />
                <StatsCard title="Active" value={activeAssessments} icon={TrendingUp} color="green" mobile="compact" />
                <StatsCard title="Finalized" value={finalizedAssessments} icon={Award} color="purple" mobile="hide" />
                <StatsCard title="Stalled" value={stalledAssessments} icon={AlertTriangle} color="orange" mobile="compact" />
            </StatStrip>

            <Card>
                {isAdminSupervisionMode && !selectedTerm ? (
                    <div className="py-12 text-center">
                        <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Select a term to view assessments.</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Assessment supervision is loaded term by term.
                        </p>
                    </div>
                ) : loading ? (
                    <div className="py-12 text-center">
                        <LoadingSpinner size="md" fullScreen={false} message="Loading assessments..." showMessage={false} />
                        <p className="mt-2 text-gray-600">Loading assessments...</p>
                    </div>
                ) : visibleAssessments.length === 0 ? (
                    <div className="py-12 text-center">
                        <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {effectiveMyTeachingMode ? 'No assessments yet' : 'No assessments found'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {isTeachingActor && !instructorAccess.hasAssignedCohortSubjects
                                ? 'Your teaching load is not assigned yet. Assessments will appear once your classes and subjects are assigned.'
                                : isAdminSupervisionMode
                                    ? 'No assessments are visible for the selected term.'
                                    : 'Try adjusting your filters.'}
                        </p>
                        {canCreateAssessment && !selectedTerm && !selectedCohort && !selectedCohortSubject && !selectedType && !selectedEvalType ? (
                            <Link href={createAssessmentHref}>
                                <Button className="mt-4">
                                    <Plus className="h-4 w-4" />
                                    {createButtonLabel}
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                ) : isAdminSupervisionMode && selectedTerm ? (
                    <div className="space-y-4 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Assessment hierarchy</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {selectedTermName} {' › '} Assessment category {' › '} Subject {' › '} Cohort
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                <Badge variant="blue">{totalEvidence} entered evidence</Badge>
                                {stalledAssessments > 0 ? (
                                    <Badge variant="orange">{stalledAssessments} stalled</Badge>
                                ) : null}
                            </div>
                        </div>
                        {hierarchy.map((category) => (
                            <AssessmentCategoryAccordion
                                key={category.key}
                                category={category}
                                termId={selectedTerm}
                                termName={selectedTermName}
                                isOpen={openCategories.has(category.key)}
                                openSubjects={openSubjects}
                                openCohorts={openCohorts}
                                onToggleCategory={() => toggleKey(setOpenCategories, category.key)}
                                onToggleSubject={(key) => toggleKey(setOpenSubjects, key)}
                                onToggleCohort={(key) => toggleKey(setOpenCohorts, key)}
                                onBulkSuccess={refetchAssessments}
                            />
                        ))}
                    </div>
                ) : (
                    <TeachingAssessmentGroups groups={teachingGroups} />
                )}
            </Card>

            {visibleAssessments.length > 0 ? (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing <span className="font-medium">{visibleAssessments.length}</span> assessments
                    </p>
                </div>
            ) : null}
        </div>
    );
}

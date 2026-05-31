'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { cohortSubjectAPI } from '@/app/core/api/academic';
import { instructorsAPI } from '@/app/core/api/instructors';
import { useTerms, useCurricula, useSubjects } from '@/app/core/hooks/useAcademic';
import { useGenerateScheme, useSchemeSubjectStrands } from '@/app/core/hooks/useSchemes';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import type { PaginatedResponse } from '@/app/core/types/api';
import type { CohortSubject, Curriculum, Subject, Term } from '@/app/core/types/academic';
import { useAuth } from '@/app/context/AuthContext';
import type {
    CurriculumRangeInput,
    ExceptionalWeekInput,
    SchemeNonBlockingExamNotes,
} from '@/app/core/types/schemes';
import {
    calculateTermWeekCount,
    flattenSubjectStrands,
    formatDateRange,
    getSchemeWeekTypeLabel,
    parseWeekInput,
    summarizeLearningWeeks,
} from '@/app/plugins/schemes/lib/workflow';

interface TeachingContextOption {
    cohortSubjectId: number;
    cohortName: string;
    subjectId: number;
    subjectName: string;
    curriculumId: number | null;
    curriculumName: string;
    curriculumType: string;
    levelLabel: string;
}

const REFLECTION_NOTICE =
    'Lesson reflections will be auto-filled from lesson reflections recorded after taught outcomes or learner performance evidence.';

function unwrapCohortSubjects(
    data: CohortSubject[] | PaginatedResponse<CohortSubject>,
): CohortSubject[] {
    return Array.isArray(data) ? data : data.results ?? [];
}

function boolOptions(label: string) {
    return [
        { value: 'false', label: `No ${label}`.trim() },
        { value: 'true', label: `Yes ${label}`.trim() },
    ];
}

function StepMarker({
    currentStep,
    step,
    title,
}: {
    currentStep: number;
    step: number;
    title: string;
}) {
    const complete = currentStep > step;
    const active = currentStep === step;

    return (
        <div className="flex items-center gap-3 rounded-lg border theme-border px-4 py-3">
            <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    complete
                        ? 'bg-green-600 text-white'
                        : active
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                }`}
            >
                {complete ? <CheckCircle2 className="h-4 w-4" /> : step}
            </div>
            <div>
                <p className="text-sm font-medium theme-text">{title}</p>
                <p className="text-xs theme-subtle">Step {step}</p>
            </div>
        </div>
    );
}

function WeekPreview({
    weekCount,
    exceptionalWeeks,
}: {
    weekCount: number;
    exceptionalWeeks: ExceptionalWeekInput[];
}) {
    const weekMap = useMemo(() => (
        new Map(exceptionalWeeks.map((week) => [week.week_number, week]))
    ), [exceptionalWeeks]);

    return (
        <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: weekCount }, (_, index) => {
                const weekNumber = index + 1;
                const exceptional = weekMap.get(weekNumber);

                return (
                    <div
                        key={weekNumber}
                        className="rounded-lg border theme-border px-3 py-2"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium theme-text">
                                Week {weekNumber}
                            </span>
                            {exceptional?.affects_learning ? (
                                <Badge variant="warning" size="sm">Non-teaching</Badge>
                            ) : (
                                <Badge variant="success" size="sm">Learning</Badge>
                            )}
                        </div>
                        <p className="mt-2 text-xs theme-subtle">
                            {exceptional
                                ? exceptional.label || getSchemeWeekTypeLabel(exceptional.week_type)
                                : 'Teaching'}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

export function CreateSchemePage() {
    const router = useRouter();
    const { activeRole, user } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const { curricula, loading: curriculaLoading } = useCurricula();
    const { terms, loading: termsLoading } = useTerms();
    const { subjects, loading: subjectsLoading } = useSubjects();
    const instructorAccess = useInstructorCohortAccess();
    const { generateScheme, submitting, error: generateError, clearError } = useGenerateScheme();

    const [adminCohortSubjects, setAdminCohortSubjects] = useState<CohortSubject[]>([]);
    const [adminContextLoading, setAdminContextLoading] = useState(!isInstructor);
    const [adminContextError, setAdminContextError] = useState<string | null>(null);
    const [adminTeachers, setAdminTeachers] = useState<Array<{ id: number; label: string }>>([]);
    const [adminTeachersLoading, setAdminTeachersLoading] = useState(!isInstructor);
    const [currentStep, setCurrentStep] = useState(1);
    const [stepError, setStepError] = useState<string | null>(null);

    const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedLevelLabel, setSelectedLevelLabel] = useState('');
    const [selectedCohortSubjectId, setSelectedCohortSubjectId] = useState('');
    const [selectedTermId, setSelectedTermId] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [title, setTitle] = useState('');
    const [titleTouched, setTitleTouched] = useState(false);

    const [entryExamAvailable, setEntryExamAvailable] = useState(false);
    const [entryExamWeeks, setEntryExamWeeks] = useState('');
    const [entryExamAffectsLearning, setEntryExamAffectsLearning] = useState(false);
    const [midtermBreakWeeks, setMidtermBreakWeeks] = useState('');
    const [midtermBreakAffectsLearning, setMidtermBreakAffectsLearning] = useState(true);
    const [midtermExamWeeks, setMidtermExamWeeks] = useState('');
    const [midtermExamAffectsLearning, setMidtermExamAffectsLearning] = useState(true);
    const [exitExamAvailable, setExitExamAvailable] = useState(false);
    const [exitExamWeeks, setExitExamWeeks] = useState('');
    const [exitExamAffectsLearning, setExitExamAffectsLearning] = useState(false);

    const [startStrandId, setStartStrandId] = useState('');
    const [startSubStrandId, setStartSubStrandId] = useState('');
    const [endStrandId, setEndStrandId] = useState('');
    const [endSubStrandId, setEndSubStrandId] = useState('');

    useEffect(() => {
        if (isInstructor) {
            setAdminContextLoading(false);
            setAdminContextError(null);
            setAdminTeachersLoading(false);
            return;
        }

        let active = true;
        setAdminContextLoading(true);
        setAdminTeachersLoading(true);
        cohortSubjectAPI.getAll()
            .then((data) => {
                if (!active) {
                    return;
                }
                setAdminCohortSubjects(unwrapCohortSubjects(data));
                setAdminContextError(null);
            })
            .catch(() => {
                if (!active) {
                    return;
                }
                setAdminCohortSubjects([]);
                setAdminContextError('We could not load the available class subjects.');
            })
            .finally(() => {
                if (!active) {
                    return;
                }
                setAdminContextLoading(false);
            });

        instructorsAPI.getAll()
            .then((rows) => {
                if (!active) {
                    return;
                }
                setAdminTeachers(
                    rows.map((teacher) => ({
                        id: teacher.id,
                        label: teacher.full_name || teacher.email,
                    })),
                );
            })
            .catch(() => {
                if (!active) {
                    return;
                }
                setAdminTeachers([]);
            })
            .finally(() => {
                if (!active) {
                    return;
                }
                setAdminTeachersLoading(false);
            });

        return () => {
            active = false;
        };
    }, [isInstructor]);

    const activeCurricula = useMemo(
        () => curricula.filter((curriculum) => curriculum.is_active),
        [curricula],
    );

    const subjectById = useMemo(() => (
        new Map(subjects.map((subject) => [subject.id, subject]))
    ), [subjects]);

    const teacherOptions = useMemo(() => {
        const currentUserOption = user
            ? [{
                value: String(user.id),
                label: `${user.full_name || `${user.first_name} ${user.last_name}`}`.trim() || user.email,
            }]
            : [];

        const instructorOptions = adminTeachers
            .filter((instructor) => instructor.id !== user?.id)
            .map((instructor) => ({
                value: String(instructor.id),
                label: instructor.label,
            }));

        return [...currentUserOption, ...instructorOptions];
    }, [adminTeachers, user]);

    const contextOptions = useMemo<TeachingContextOption[]>(() => {
        if (isInstructor) {
            return instructorAccess.assignments
                .filter((assignment) => typeof assignment.cohort_subject_id === 'number')
                .map((assignment) => ({
                    cohortSubjectId: assignment.cohort_subject_id as number,
                    cohortName: assignment.cohort_name,
                    subjectId: assignment.subject_id,
                    subjectName: assignment.subject_name,
                    curriculumId: assignment.curriculum_id ?? null,
                    curriculumName: assignment.curriculum_name ?? 'Curriculum',
                    curriculumType: assignment.curriculum_type,
                    levelLabel: assignment.level,
                }));
        }

        return adminCohortSubjects.map((cohortSubject) => {
            const subject = subjectById.get(cohortSubject.subject_id ?? cohortSubject.subject);
            return {
                cohortSubjectId: cohortSubject.id,
                cohortName: cohortSubject.cohort_name,
                subjectId: cohortSubject.subject_id ?? cohortSubject.subject,
                subjectName: cohortSubject.subject_name,
                curriculumId: subject?.curriculum ?? null,
                curriculumName: subject?.curriculum_name ?? cohortSubject.curriculum_name,
                curriculumType: subject?.curriculum_type ?? cohortSubject.curriculum_type,
                levelLabel: cohortSubject.cohort_level || subject?.level || 'Level',
            };
        });
    }, [adminCohortSubjects, instructorAccess.assignments, isInstructor, subjectById]);

    useEffect(() => {
        if (activeCurricula.length === 1 && !selectedCurriculumId) {
            setSelectedCurriculumId(String(activeCurricula[0].id));
        }
    }, [activeCurricula, selectedCurriculumId]);

    useEffect(() => {
        if (isInstructor && contextOptions.length === 1 && !selectedCohortSubjectId) {
            const [option] = contextOptions;
            setSelectedCurriculumId(option.curriculumId ? String(option.curriculumId) : '');
            setSelectedSubjectId(String(option.subjectId));
            setSelectedLevelLabel(option.levelLabel);
            setSelectedCohortSubjectId(String(option.cohortSubjectId));
        }
    }, [contextOptions, isInstructor, selectedCohortSubjectId]);

    useEffect(() => {
        if (!isInstructor && user && !selectedTeacherId) {
            setSelectedTeacherId(String(user.id));
        }
    }, [isInstructor, selectedTeacherId, user]);

    const curriculumFilteredContexts = useMemo(
        () => contextOptions.filter((option) => (
            !selectedCurriculumId || String(option.curriculumId ?? '') === selectedCurriculumId
        )),
        [contextOptions, selectedCurriculumId],
    );

    const levelFilteredContexts = useMemo(
        () => curriculumFilteredContexts.filter((option) => (
            !selectedSubjectId || String(option.subjectId) === selectedSubjectId
        )),
        [curriculumFilteredContexts, selectedSubjectId],
    );

    const filteredContextOptions = useMemo(
        () => levelFilteredContexts.filter((option) => (
            !selectedLevelLabel || option.levelLabel === selectedLevelLabel
        )),
        [levelFilteredContexts, selectedLevelLabel],
    );

    const selectedContext = useMemo(
        () => filteredContextOptions.find((option) => String(option.cohortSubjectId) === selectedCohortSubjectId)
            ?? contextOptions.find((option) => String(option.cohortSubjectId) === selectedCohortSubjectId)
            ?? null,
        [contextOptions, filteredContextOptions, selectedCohortSubjectId],
    );

    useEffect(() => {
        if (!selectedContext) {
            return;
        }

        setSelectedCurriculumId(selectedContext.curriculumId ? String(selectedContext.curriculumId) : '');
        setSelectedSubjectId(String(selectedContext.subjectId));
        setSelectedLevelLabel(selectedContext.levelLabel);
    }, [selectedContext]);

    useEffect(() => {
        if (filteredContextOptions.length === 1 && !selectedCohortSubjectId) {
            setSelectedCohortSubjectId(String(filteredContextOptions[0].cohortSubjectId));
        }
    }, [filteredContextOptions, selectedCohortSubjectId]);

    const selectedCurriculum = useMemo<Curriculum | null>(() => (
        selectedCurriculumId
            ? curricula.find((curriculum) => String(curriculum.id) === selectedCurriculumId) ?? null
            : null
    ), [curricula, selectedCurriculumId]);

    const resolvedSelectedSubjectId = selectedContext?.subjectId
        ?? (selectedSubjectId ? Number(selectedSubjectId) : null);

    const selectedSubject = useMemo<Subject | null>(() => (
        resolvedSelectedSubjectId
            ? subjects.find((subject) => subject.id === resolvedSelectedSubjectId) ?? null
            : null
    ), [resolvedSelectedSubjectId, subjects]);

    const selectedSubjectLabel = selectedSubject?.name ?? selectedContext?.subjectName ?? 'Not selected';

    const selectedTerm = useMemo<Term | null>(() => (
        selectedTermId
            ? terms.find((term) => String(term.id) === selectedTermId) ?? null
            : null
    ), [selectedTermId, terms]);

    useEffect(() => {
        if (titleTouched) {
            return;
        }

        if (!selectedContext || !selectedTerm) {
            return;
        }

        setTitle(
            `${selectedContext.levelLabel} ${selectedContext.subjectName} ${selectedTerm.name} Scheme of Work`,
        );
    }, [selectedContext, selectedTerm, titleTouched]);

    useEffect(() => {
        if (!entryExamAvailable) {
            setEntryExamWeeks('');
            setEntryExamAffectsLearning(false);
        }
    }, [entryExamAvailable]);

    useEffect(() => {
        if (!exitExamAvailable) {
            setExitExamWeeks('');
            setExitExamAffectsLearning(false);
        }
    }, [exitExamAvailable]);

    const {
        strands,
        loading: strandsLoading,
        error: strandsError,
    } = useSchemeSubjectStrands(resolvedSelectedSubjectId);

    const flattenedSubStrands = useMemo(
        () => flattenSubjectStrands(strands),
        [strands],
    );

    useEffect(() => {
        if (flattenedSubStrands.length === 0) {
            setStartStrandId('');
            setStartSubStrandId('');
            setEndStrandId('');
            setEndSubStrandId('');
            return;
        }

        const first = flattenedSubStrands[0];
        const last = flattenedSubStrands[flattenedSubStrands.length - 1];

        if (!startStrandId) {
            setStartStrandId(String(first.strandId));
        }
        if (!startSubStrandId) {
            setStartSubStrandId(String(first.subStrandId));
        }
        if (!endStrandId) {
            setEndStrandId(String(last.strandId));
        }
        if (!endSubStrandId) {
            setEndSubStrandId(String(last.subStrandId));
        }
    }, [endStrandId, endSubStrandId, flattenedSubStrands, startStrandId, startSubStrandId]);

    const startStrandOptions = useMemo(
        () => strands.map((strand) => ({
            value: String(strand.id),
            label: strand.name,
        })),
        [strands],
    );

    const endStrandOptions = startStrandOptions;

    const startSubStrandOptions = useMemo(
        () => strands
            .find((strand) => String(strand.id) === startStrandId)
            ?.sub_strands
            .map((subStrand) => ({
                value: String(subStrand.id),
                label: subStrand.name,
            })) ?? [],
        [startStrandId, strands],
    );

    const endSubStrandOptions = useMemo(
        () => strands
            .find((strand) => String(strand.id) === endStrandId)
            ?.sub_strands
            .map((subStrand) => ({
                value: String(subStrand.id),
                label: subStrand.name,
            })) ?? [],
        [endStrandId, strands],
    );

    const termWeekCount = selectedTerm
        ? calculateTermWeekCount(selectedTerm.start_date, selectedTerm.end_date)
        : 0;

    const exceptionalWeekPreview = useMemo(() => {
        if (!selectedTerm) {
            return {
                exceptionalWeeks: [] as ExceptionalWeekInput[],
                notes: {} as SchemeNonBlockingExamNotes,
                error: null as string | null,
            };
        }

        const exceptionalWeeks: ExceptionalWeekInput[] = [];
        const seenWeeks = new Set<number>();

        const pushWeeks = (
            rawValue: string,
            weekType: ExceptionalWeekInput['week_type'],
            affectsLearning: boolean,
            label: string,
            notes: string,
        ): string | null => {
            const parsed = parseWeekInput(rawValue, termWeekCount);
            if (parsed.error) {
                return parsed.error;
            }

            for (const weekNumber of parsed.weeks) {
                if (seenWeeks.has(weekNumber)) {
                    return `Week ${weekNumber} has been used more than once.`;
                }
                seenWeeks.add(weekNumber);
                exceptionalWeeks.push({
                    week_number: weekNumber,
                    week_type: weekType,
                    affects_learning: affectsLearning,
                    label,
                    notes,
                });
            }

            return null;
        };

        if (entryExamAvailable && entryExamAffectsLearning) {
            const error = pushWeeks(
                entryExamWeeks,
                'ENTRY_EXAM',
                true,
                'Entry Exams',
                'Entry exams',
            );
            if (error) {
                return {
                    exceptionalWeeks: [],
                    notes: {},
                    error,
                };
            }
        }

        if (midtermBreakWeeks.trim()) {
            const error = pushWeeks(
                midtermBreakWeeks,
                'MIDTERM_BREAK',
                midtermBreakAffectsLearning,
                'Midterm Break',
                'Midterm break',
            );
            if (error) {
                return {
                    exceptionalWeeks: [],
                    notes: {},
                    error,
                };
            }
        }

        if (midtermExamWeeks.trim()) {
            const error = pushWeeks(
                midtermExamWeeks,
                'MIDTERM_EXAM',
                midtermExamAffectsLearning,
                'Midterm Exams',
                'Midterm exams',
            );
            if (error) {
                return {
                    exceptionalWeeks: [],
                    notes: {},
                    error,
                };
            }
        }

        if (exitExamAvailable && exitExamAffectsLearning) {
            const error = pushWeeks(
                exitExamWeeks,
                'EXIT_EXAM',
                true,
                'End Term Exams',
                'End term exams',
            );
            if (error) {
                return {
                    exceptionalWeeks: [],
                    notes: {},
                    error,
                };
            }
        }

        return {
            exceptionalWeeks,
            notes: {
                entry_exam_available: entryExamAvailable,
                entry_exam_affects_learning: entryExamAffectsLearning,
                exit_exam_available: exitExamAvailable,
                exit_exam_affects_learning: exitExamAffectsLearning,
            },
            error: null,
        };
    }, [
        entryExamAffectsLearning,
        entryExamAvailable,
        entryExamWeeks,
        exitExamAffectsLearning,
        exitExamAvailable,
        exitExamWeeks,
        midtermBreakAffectsLearning,
        midtermBreakWeeks,
        midtermExamAffectsLearning,
        midtermExamWeeks,
        selectedTerm,
        termWeekCount,
    ]);

    const learningWeekSummary = useMemo(
        () => summarizeLearningWeeks(termWeekCount, exceptionalWeekPreview.exceptionalWeeks),
        [exceptionalWeekPreview.exceptionalWeeks, termWeekCount],
    );

    const rangeValidation = useMemo(() => {
        if (!startSubStrandId || !endSubStrandId) {
            return {
                error: 'Choose the first and last topic to cover.',
                curriculumRange: null as CurriculumRangeInput | null,
            };
        }

        const start = flattenedSubStrands.find(
            (item) => String(item.subStrandId) === startSubStrandId,
        );
        const end = flattenedSubStrands.find(
            (item) => String(item.subStrandId) === endSubStrandId,
        );

        if (!start || !end) {
            return {
                error: 'The selected strand range could not be resolved.',
                curriculumRange: null,
            };
        }

        if (start.order > end.order) {
            return {
                error: 'The first topic to cover must come before the last topic to cover.',
                curriculumRange: null,
            };
        }

        return {
            error: null,
            curriculumRange: {
                start_strand_id: start.strandId,
                start_substrand_id: start.subStrandId,
                end_strand_id: end.strandId,
                end_substrand_id: end.subStrandId,
            },
        };
    }, [endSubStrandId, flattenedSubStrands, startSubStrandId]);

    const validateStep = (step: number): string | null => {
        if (step === 1) {
            if (!selectedCurriculum) {
                return 'Choose the curriculum.';
            }
            if (!resolvedSelectedSubjectId || Number.isNaN(resolvedSelectedSubjectId)) {
                return 'Choose the subject.';
            }
            if (!selectedLevelLabel) {
                return 'Choose the level or grade.';
            }
            if (!selectedCohortSubjectId) {
                return 'Choose the class / subject.';
            }
            if (!selectedTerm) {
                return 'Choose the teaching term.';
            }
            return null;
        }

        if (step === 2) {
            if (!selectedTerm) {
                return 'Choose the teaching term first.';
            }
            if (entryExamAvailable && !entryExamWeeks.trim() && entryExamAffectsLearning) {
                return 'Add the entry exam week before continuing.';
            }
            if (exitExamAvailable && !exitExamWeeks.trim() && exitExamAffectsLearning) {
                return 'Add the end term exam week before continuing.';
            }
            if (exceptionalWeekPreview.error) {
                return exceptionalWeekPreview.error;
            }
            if (learningWeekSummary.activeLearningWeekCount <= 0) {
                return 'There must be at least one active learning week.';
            }
            return null;
        }

        if (step === 3) {
            if (strandsError) {
                return strandsError;
            }
            if (flattenedSubStrands.length === 0) {
                return 'No strand range is available for this subject yet.';
            }
            return rangeValidation.error;
        }

        return null;
    };

    const loading =
        curriculaLoading
        || termsLoading
        || subjectsLoading
        || adminContextLoading
        || adminTeachersLoading
        || (currentStep === 3 && strandsLoading);

    const handleNext = () => {
        const error = validateStep(currentStep);
        if (error) {
            setStepError(error);
            return;
        }

        setStepError(null);
        clearError();
        setCurrentStep((step) => Math.min(step + 1, 4));
    };

    const handleBack = () => {
        setStepError(null);
        clearError();
        setCurrentStep((step) => Math.max(step - 1, 1));
    };

    const handleGenerate = async () => {
        const validationError = validateStep(1) || validateStep(2) || validateStep(3);
        if (validationError) {
            setStepError(validationError);
            return;
        }

        if (!selectedTerm || !selectedCohortSubjectId || !rangeValidation.curriculumRange) {
            setStepError('Complete the draft scheme setup before generating.');
            return;
        }

        try {
            setStepError(null);
            clearError();

            const payload = {
                term: Number(selectedTermId),
                cohort_subject: Number(selectedCohortSubjectId),
                title: title.trim(),
                exceptional_weeks: exceptionalWeekPreview.exceptionalWeeks,
                non_blocking_exam_notes: exceptionalWeekPreview.notes,
                curriculum_range: rangeValidation.curriculumRange,
                generation_mode: 'AI_ASSISTED_DRAFT' as const,
                ...(selectedTeacherId && !isInstructor && user && Number(selectedTeacherId) !== user.id
                    ? { teacher: Number(selectedTeacherId) }
                    : {}),
            };

            const generated = await generateScheme(payload);
            router.push(`/schemes/${generated.id}`);
        } catch (err) {
            setStepError(
                err instanceof Error ? err.message : 'We could not generate the draft scheme.',
            );
        }
    };

    if (loading && currentStep === 1) {
        return <LoadingSpinner message="Loading scheme setup..." fullScreen={false} />;
    }

    if (adminContextError) {
        return <ErrorState message={adminContextError} fullScreen={false} />;
    }

    const visibleError = stepError || generateError || null;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/schemes">
                    <Button type="button" variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Schemes
                    </Button>
                </Link>
            </div>

            <div>
                <h1 className="text-2xl font-bold theme-text">Create Draft Scheme</h1>
                <p className="mt-1 text-sm theme-subtle">
                    Set the teaching context, learning weeks, and strand range before generating the draft.
                </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-4">
                <StepMarker currentStep={currentStep} step={1} title="Teaching Context" />
                <StepMarker currentStep={currentStep} step={2} title="Learning Weeks" />
                <StepMarker currentStep={currentStep} step={3} title="Strand Range" />
                <StepMarker currentStep={currentStep} step={4} title="Review & Generate" />
            </div>

            {visibleError ? (
                <ErrorBanner
                    title="Draft scheme setup"
                    message={visibleError}
                    onDismiss={() => {
                        setStepError(null);
                        clearError();
                    }}
                />
            ) : null}

            {currentStep === 1 ? (
                <Card className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold theme-text">Step 1: Select teaching context</h2>
                        <p className="mt-1 text-sm theme-subtle">
                            Choose the curriculum, class subject, and teaching term for this draft scheme.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Select
                            label="Curriculum"
                            value={selectedCurriculumId}
                                onChange={(event) => {
                                    setSelectedCurriculumId(event.target.value);
                                    setSelectedCohortSubjectId('');
                                }}
                            options={[
                                { value: '', label: 'Select curriculum' },
                                ...activeCurricula.map((curriculum) => ({
                                    value: String(curriculum.id),
                                    label: curriculum.name,
                                })),
                            ]}
                        />

                        <Select
                            label="Subject"
                                value={selectedSubjectId}
                                onChange={(event) => {
                                    setSelectedSubjectId(event.target.value);
                                    setSelectedCohortSubjectId('');
                                }}
                            options={[
                                { value: '', label: 'Select subject' },
                                ...Array.from(new Map(
                                    curriculumFilteredContexts.map((option) => [
                                        option.subjectId,
                                        {
                                            value: String(option.subjectId),
                                            label: option.subjectName,
                                        },
                                    ]),
                                ).values()),
                            ]}
                        />

                        <Select
                            label="Level / Grade"
                                value={selectedLevelLabel}
                                onChange={(event) => {
                                    setSelectedLevelLabel(event.target.value);
                                    setSelectedCohortSubjectId('');
                                }}
                            options={[
                                { value: '', label: 'Select level / grade' },
                                ...Array.from(new Set(
                                    levelFilteredContexts.map((option) => option.levelLabel),
                                )).map((levelLabel) => ({
                                    value: levelLabel,
                                    label: levelLabel,
                                })),
                            ]}
                        />

                        <Select
                            label="Class / Subject"
                            value={selectedCohortSubjectId}
                            onChange={(event) => setSelectedCohortSubjectId(event.target.value)}
                            options={[
                                { value: '', label: 'Select class / subject' },
                                ...filteredContextOptions.map((option) => ({
                                    value: String(option.cohortSubjectId),
                                    label: `${option.cohortName} • ${option.subjectName}`,
                                })),
                            ]}
                        />

                        <Select
                            label="Teaching Term"
                            value={selectedTermId}
                            onChange={(event) => setSelectedTermId(event.target.value)}
                            options={[
                                { value: '', label: 'Select term' },
                                ...terms.map((term) => ({
                                    value: String(term.id),
                                    label: `${term.name} • ${formatDateRange(term.start_date, term.end_date)} • ${calculateTermWeekCount(term.start_date, term.end_date)} weeks`,
                                })),
                            ]}
                        />

                        {!isInstructor ? (
                            <Select
                                label="Teacher"
                                value={selectedTeacherId}
                                onChange={(event) => setSelectedTeacherId(event.target.value)}
                                options={[
                                    { value: '', label: 'Select teacher' },
                                    ...teacherOptions,
                                ]}
                            />
                        ) : null}
                    </div>

                    <Input
                        label="Scheme title"
                        value={title}
                        onChange={(event) => {
                            setTitle(event.target.value);
                            setTitleTouched(true);
                        }}
                        placeholder="Grade 7 Mathematics Term 1 Scheme of Work"
                    />

                    {selectedTerm ? (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                            <div className="flex items-start gap-3">
                                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                    <p className="font-medium">Teaching term</p>
                                    <p className="mt-1">
                                        {selectedTerm.name} runs from {formatDateRange(selectedTerm.start_date, selectedTerm.end_date)}.
                                        The draft will use {termWeekCount} term weeks from the server term dates.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </Card>
            ) : null}

            {currentStep === 2 ? (
                <Card className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold theme-text">Step 2: Set learning weeks and exams</h2>
                        <p className="mt-1 text-sm theme-subtle">
                            Record any weeks that reduce teaching time and note entry or end term exams that stay as context only.
                        </p>
                    </div>

                    {selectedTerm ? (
                        <>
                            <WeekPreview
                                weekCount={termWeekCount}
                                exceptionalWeeks={exceptionalWeekPreview.exceptionalWeeks}
                            />

                            <div className="rounded-xl border theme-border bg-gray-50 px-4 py-3 text-sm theme-text">
                                {termWeekCount} term weeks, {learningWeekSummary.nonTeachingWeekCount} non-teaching weeks, {learningWeekSummary.activeLearningWeekCount} active learning weeks.
                            </div>
                        </>
                    ) : null}

                    <div className="grid gap-4 xl:grid-cols-2">
                        <Card className="space-y-4">
                            <h3 className="text-base font-semibold theme-text">Entry Exams</h3>
                            <Select
                                label="Are there entry exams?"
                                value={String(entryExamAvailable)}
                                onChange={(event) => setEntryExamAvailable(event.target.value === 'true')}
                                options={boolOptions('')}
                            />
                            {entryExamAvailable ? (
                                <>
                                    <Input
                                        label="Week(s)"
                                        value={entryExamWeeks}
                                        onChange={(event) => setEntryExamWeeks(event.target.value)}
                                        placeholder="1 or 1-2"
                                    />
                                    <Select
                                        label="Does this affect learning?"
                                        value={String(entryExamAffectsLearning)}
                                        onChange={(event) => setEntryExamAffectsLearning(event.target.value === 'true')}
                                        options={[
                                            { value: 'false', label: 'No, keep learning week' },
                                            { value: 'true', label: 'Yes, reduce learning week' },
                                        ]}
                                    />
                                    {!entryExamAffectsLearning ? (
                                        <p className="text-xs theme-subtle">
                                            This will be recorded as context only and will not reduce learning weeks.
                                        </p>
                                    ) : null}
                                </>
                            ) : null}
                        </Card>

                        <Card className="space-y-4">
                            <h3 className="text-base font-semibold theme-text">Midterm Break</h3>
                            <Input
                                label="Week(s)"
                                value={midtermBreakWeeks}
                                onChange={(event) => setMidtermBreakWeeks(event.target.value)}
                                placeholder="9"
                            />
                            <Select
                                label="Does this affect learning?"
                                value={String(midtermBreakAffectsLearning)}
                                onChange={(event) => setMidtermBreakAffectsLearning(event.target.value === 'true')}
                                options={[
                                    { value: 'true', label: 'Yes, reduce learning week' },
                                    { value: 'false', label: 'No, keep learning week' },
                                ]}
                            />
                        </Card>

                        <Card className="space-y-4">
                            <h3 className="text-base font-semibold theme-text">Midterm Exams</h3>
                            <Input
                                label="Week(s)"
                                value={midtermExamWeeks}
                                onChange={(event) => setMidtermExamWeeks(event.target.value)}
                                placeholder="10-11"
                            />
                            <Select
                                label="Does this affect learning?"
                                value={String(midtermExamAffectsLearning)}
                                onChange={(event) => setMidtermExamAffectsLearning(event.target.value === 'true')}
                                options={[
                                    { value: 'true', label: 'Yes, reduce learning week' },
                                    { value: 'false', label: 'No, keep learning week' },
                                ]}
                            />
                        </Card>

                        <Card className="space-y-4">
                            <h3 className="text-base font-semibold theme-text">End Term Exams</h3>
                            <Select
                                label="Are there end term exams?"
                                value={String(exitExamAvailable)}
                                onChange={(event) => setExitExamAvailable(event.target.value === 'true')}
                                options={boolOptions('')}
                            />
                            {exitExamAvailable ? (
                                <>
                                    <Input
                                        label="Week(s)"
                                        value={exitExamWeeks}
                                        onChange={(event) => setExitExamWeeks(event.target.value)}
                                        placeholder="14"
                                    />
                                    <Select
                                        label="Does this affect learning?"
                                        value={String(exitExamAffectsLearning)}
                                        onChange={(event) => setExitExamAffectsLearning(event.target.value === 'true')}
                                        options={[
                                            { value: 'false', label: 'No, keep learning week' },
                                            { value: 'true', label: 'Yes, reduce learning week' },
                                        ]}
                                    />
                                    {!exitExamAffectsLearning ? (
                                        <p className="text-xs theme-subtle">
                                            This will be recorded as context only and will not reduce learning weeks.
                                        </p>
                                    ) : null}
                                </>
                            ) : null}
                        </Card>
                    </div>
                </Card>
            ) : null}

            {currentStep === 3 ? (
                <Card className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold theme-text">Step 3: Select curriculum range</h2>
                        <p className="mt-1 text-sm theme-subtle">
                            The system will include all strands and sub-strands in this range and distribute them across active learning weeks.
                        </p>
                    </div>

                    {strandsError ? (
                        <ErrorState message={strandsError} fullScreen={false} />
                    ) : flattenedSubStrands.length === 0 ? (
                        <div className="rounded-xl border theme-border bg-gray-50 px-4 py-5 text-sm theme-subtle">
                            No strand structure is available for this subject yet.
                        </div>
                    ) : (
                        <div className="grid gap-4 xl:grid-cols-2">
                            <Card className="space-y-4">
                                <h3 className="text-base font-semibold theme-text">First topic to cover</h3>
                                <Select
                                    label="First Strand"
                                    value={startStrandId}
                                    onChange={(event) => {
                                        setStartStrandId(event.target.value);
                                        setStartSubStrandId('');
                                    }}
                                    options={[
                                        { value: '', label: 'Select first strand' },
                                        ...startStrandOptions,
                                    ]}
                                />
                                <Select
                                    label="First Sub-strand"
                                    value={startSubStrandId}
                                    onChange={(event) => setStartSubStrandId(event.target.value)}
                                    options={[
                                        { value: '', label: 'Select first sub-strand' },
                                        ...startSubStrandOptions,
                                    ]}
                                />
                            </Card>

                            <Card className="space-y-4">
                                <h3 className="text-base font-semibold theme-text">Last topic to cover</h3>
                                <Select
                                    label="Last Strand"
                                    value={endStrandId}
                                    onChange={(event) => {
                                        setEndStrandId(event.target.value);
                                        setEndSubStrandId('');
                                    }}
                                    options={[
                                        { value: '', label: 'Select last strand' },
                                        ...endStrandOptions,
                                    ]}
                                />
                                <Select
                                    label="Last Sub-strand"
                                    value={endSubStrandId}
                                    onChange={(event) => setEndSubStrandId(event.target.value)}
                                    options={[
                                        { value: '', label: 'Select last sub-strand' },
                                        ...endSubStrandOptions,
                                    ]}
                                />
                            </Card>
                        </div>
                    )}
                </Card>
            ) : null}

            {currentStep === 4 ? (
                <Card className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold theme-text">Step 4: Review and generate</h2>
                        <p className="mt-1 text-sm theme-subtle">
                            Confirm the draft scheme setup before generating the editable table.
                        </p>
                    </div>

                    <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Curriculum</dt>
                            <dd className="mt-1 text-sm theme-text">{selectedCurriculum?.name ?? 'Not selected'}</dd>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Subject</dt>
                            <dd className="mt-1 text-sm theme-text">{selectedSubjectLabel}</dd>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Level / Grade</dt>
                            <dd className="mt-1 text-sm theme-text">{selectedLevelLabel || 'Not selected'}</dd>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Teaching Term</dt>
                            <dd className="mt-1 text-sm theme-text">{selectedTerm?.name ?? 'Not selected'}</dd>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Active weeks</dt>
                            <dd className="mt-1 text-sm theme-text">{learningWeekSummary.activeLearningWeekCount}</dd>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Exceptional weeks</dt>
                            <dd className="mt-1 text-sm theme-text">
                                {exceptionalWeekPreview.exceptionalWeeks.length === 0
                                    ? 'None'
                                    : exceptionalWeekPreview.exceptionalWeeks
                                        .map((week) => `Week ${week.week_number} (${getSchemeWeekTypeLabel(week.week_type)})`)
                                        .join(', ')}
                            </dd>
                        </div>
                    </dl>

                    <div className="rounded-xl border theme-border bg-gray-50 px-4 py-4">
                        <p className="text-sm font-medium theme-text">Strand Range</p>
                        <p className="mt-1 text-sm theme-subtle">
                            {flattenedSubStrands.find((item) => String(item.subStrandId) === startSubStrandId)?.strandName}
                            {' • '}
                            {flattenedSubStrands.find((item) => String(item.subStrandId) === startSubStrandId)?.subStrandName}
                            {'  '}to{'  '}
                            {flattenedSubStrands.find((item) => String(item.subStrandId) === endSubStrandId)?.strandName}
                            {' • '}
                            {flattenedSubStrands.find((item) => String(item.subStrandId) === endSubStrandId)?.subStrandName}
                        </p>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                        <div className="flex items-start gap-3">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p className="font-medium">Reflection notice</p>
                                <p className="mt-1">{REFLECTION_NOTICE}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    disabled={currentStep === 1 || submitting}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </Button>

                <div className="flex flex-col gap-3 sm:flex-row">
                    {currentStep < 4 ? (
                        <Button type="button" onClick={handleNext}>
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button type="button" onClick={() => void handleGenerate()} disabled={submitting}>
                            {submitting ? 'Generating...' : 'Generate Draft Scheme'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

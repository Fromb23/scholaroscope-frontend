'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { cohortSubjectAPI } from '@/app/core/api/academic';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
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
  GenerateSchemePayload,
  SchemeNonBlockingExamNotes,
  SchemeWeekType,
} from '@/app/core/types/schemes';
import {
  calculateTermWeekCount,
  flattenSubjectStrands,
  formatDateRange,
  getSchemeWeekTypeLabel,
  summarizeLearningWeeks,
} from '@/app/plugins/schemes/lib/workflow';
import { TextAreaField } from '@/app/plugins/schemes/components/TextAreaField';

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

interface CreateSchemeWeekConfig {
  week_number: number;
  week_type: SchemeWeekType;
  affects_learning: boolean;
  notes: string;
}

const REFLECTION_NOTICE =
  'Lesson reflections will be auto-filled from lesson reflections recorded after taught outcomes or learner performance evidence.';
const NO_REGISTERED_STRAND_RANGE_MESSAGE =
  "No strand range is registered for this class subject yet. Register the subject's sub-strands in curriculum setup before generating a scheme.";
const CREATE_WEEK_TYPE_OPTIONS: Array<{ value: SchemeWeekType; label: string }> = [
  { value: 'TEACHING', label: 'Teaching week' },
  { value: 'MIDTERM_BREAK', label: 'Midterm break' },
  { value: 'MIDTERM_EXAM', label: 'Midterm exams' },
  { value: 'ENTRY_EXAM', label: 'Entry exams' },
  { value: 'EXIT_EXAM', label: 'End term exams' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'OTHER', label: 'Other' },
];

function unwrapCohortSubjects(
  data: CohortSubject[] | PaginatedResponse<CohortSubject>,
): CohortSubject[] {
  return Array.isArray(data) ? data : (data.results ?? []);
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

function buildLearningWeekConfigs(weekCount: number): CreateSchemeWeekConfig[] {
  return Array.from({ length: weekCount }, (_, index) => ({
    week_number: index + 1,
    week_type: 'TEACHING',
    affects_learning: false,
    notes: '',
  }));
}

function parseIntegerInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
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
  const [learningWeeks, setLearningWeeks] = useState<CreateSchemeWeekConfig[]>([]);
  const [expandedLearningWeek, setExpandedLearningWeek] = useState<number | null>(1);
  const [expandedWeekNotes, setExpandedWeekNotes] = useState<Record<number, boolean>>({});
  const [lessonsPerWeek, setLessonsPerWeek] = useState('1');
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState('40');
  const [weeklyTeachingLoadConfirmed, setWeeklyTeachingLoadConfirmed] = useState(false);

  const [startStrandId, setStartStrandId] = useState('');
  const [startSubStrandId, setStartSubStrandId] = useState('');
  const [endStrandId, setEndStrandId] = useState('');
  const [endSubStrandId, setEndSubStrandId] = useState('');
  const [rangeInitializedForKey, setRangeInitializedForKey] = useState<string | null>(null);
  const [rangeTouched, setRangeTouched] = useState(false);
  const [generationFailure, setGenerationFailure] = useState<string | null>(null);

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
    cohortSubjectAPI
      .getAll()
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

    instructorsAPI
      .getAll()
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

  const subjectById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const teacherOptions = useMemo(() => {
    const currentUserOption = user
      ? [
          {
            value: String(user.id),
            label:
              `${user.full_name || `${user.first_name} ${user.last_name}`}`.trim() || user.email,
          },
        ]
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
    () =>
      contextOptions.filter(
        (option) =>
          !selectedCurriculumId || String(option.curriculumId ?? '') === selectedCurriculumId,
      ),
    [contextOptions, selectedCurriculumId],
  );

  const levelFilteredContexts = useMemo(
    () =>
      curriculumFilteredContexts.filter(
        (option) => !selectedSubjectId || String(option.subjectId) === selectedSubjectId,
      ),
    [curriculumFilteredContexts, selectedSubjectId],
  );

  const filteredContextOptions = useMemo(
    () =>
      levelFilteredContexts.filter(
        (option) => !selectedLevelLabel || option.levelLabel === selectedLevelLabel,
      ),
    [levelFilteredContexts, selectedLevelLabel],
  );

  const selectedContext = useMemo(
    () =>
      filteredContextOptions.find(
        (option) => String(option.cohortSubjectId) === selectedCohortSubjectId,
      ) ??
      contextOptions.find((option) => String(option.cohortSubjectId) === selectedCohortSubjectId) ??
      null,
    [contextOptions, filteredContextOptions, selectedCohortSubjectId],
  );

  useEffect(() => {
    if (!selectedContext) {
      return;
    }

    setSelectedCurriculumId(
      selectedContext.curriculumId ? String(selectedContext.curriculumId) : '',
    );
    setSelectedSubjectId(String(selectedContext.subjectId));
    setSelectedLevelLabel(selectedContext.levelLabel);
  }, [selectedContext]);

  useEffect(() => {
    if (filteredContextOptions.length === 1 && !selectedCohortSubjectId) {
      setSelectedCohortSubjectId(String(filteredContextOptions[0].cohortSubjectId));
    }
  }, [filteredContextOptions, selectedCohortSubjectId]);

  const selectedCurriculum = useMemo<Curriculum | null>(
    () =>
      selectedCurriculumId
        ? (curricula.find((curriculum) => String(curriculum.id) === selectedCurriculumId) ?? null)
        : null,
    [curricula, selectedCurriculumId],
  );

  const resolvedSelectedCohortSubjectId =
    selectedContext?.cohortSubjectId ??
    (selectedCohortSubjectId ? Number(selectedCohortSubjectId) : null);

  const resolvedSelectedSubjectId =
    selectedContext?.subjectId ?? (selectedSubjectId ? Number(selectedSubjectId) : null);

  const selectedSubject = useMemo<Subject | null>(
    () =>
      resolvedSelectedSubjectId
        ? (subjects.find((subject) => subject.id === resolvedSelectedSubjectId) ?? null)
        : null,
    [resolvedSelectedSubjectId, subjects],
  );

  const selectedSubjectLabel =
    selectedSubject?.name ?? selectedContext?.subjectName ?? 'Not selected';

  const selectedTerm = useMemo<Term | null>(
    () =>
      selectedTermId ? (terms.find((term) => String(term.id) === selectedTermId) ?? null) : null,
    [selectedTermId, terms],
  );

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

  const {
    strands,
    loading: strandsLoading,
    error: strandsError,
  } = useSchemeSubjectStrands(resolvedSelectedCohortSubjectId);

  const flattenedSubStrands = useMemo(() => flattenSubjectStrands(strands), [strands]);
  const strandRangeKey = useMemo(() => {
    if (!resolvedSelectedCohortSubjectId || flattenedSubStrands.length === 0) {
      return null;
    }

    return `${resolvedSelectedCohortSubjectId}:${flattenedSubStrands
      .map((item) => item.subStrandId)
      .join(',')}`;
  }, [flattenedSubStrands, resolvedSelectedCohortSubjectId]);

  const resolveSubStrandIdForStrand = useCallback(
    (strandId: string, edge: 'first' | 'last') => {
      const strand = strands.find((item) => String(item.id) === strandId);
      if (!strand || strand.sub_strands.length === 0) {
        return '';
      }

      const subStrand =
        edge === 'last'
          ? strand.sub_strands[strand.sub_strands.length - 1]
          : strand.sub_strands[0];
      return String(subStrand.id);
    },
    [strands],
  );

  useEffect(() => {
    if (!strandRangeKey || flattenedSubStrands.length === 0) {
      setStartStrandId('');
      setStartSubStrandId('');
      setEndStrandId('');
      setEndSubStrandId('');
      setRangeInitializedForKey(null);
      setRangeTouched(false);
      return;
    }

    if (rangeInitializedForKey === strandRangeKey) {
      return;
    }

    const first = flattenedSubStrands[0];
    const last = flattenedSubStrands[flattenedSubStrands.length - 1];
    setStartStrandId(String(first.strandId));
    setStartSubStrandId(String(first.subStrandId));
    setEndStrandId(String(last.strandId));
    setEndSubStrandId(String(last.subStrandId));
    setRangeInitializedForKey(strandRangeKey);
    setRangeTouched(false);
  }, [flattenedSubStrands, rangeInitializedForKey, strandRangeKey]);

  const startStrandOptions = useMemo(
    () =>
      strands.map((strand) => ({
        value: String(strand.id),
        label: strand.name,
      })),
    [strands],
  );

  const endStrandOptions = startStrandOptions;

  const startSubStrandOptions = useMemo(
    () =>
      strands
        .find((strand) => String(strand.id) === startStrandId)
        ?.sub_strands.map((subStrand) => ({
          value: String(subStrand.id),
          label: subStrand.name,
        })) ?? [],
    [startStrandId, strands],
  );

  const endSubStrandOptions = useMemo(
    () =>
      strands
        .find((strand) => String(strand.id) === endStrandId)
        ?.sub_strands.map((subStrand) => ({
          value: String(subStrand.id),
          label: subStrand.name,
        })) ?? [],
    [endStrandId, strands],
  );

  const termWeekCount = selectedTerm
    ? calculateTermWeekCount(selectedTerm.start_date, selectedTerm.end_date)
    : 0;

  useEffect(() => {
    if (termWeekCount <= 0) {
      setLearningWeeks([]);
      setExpandedLearningWeek(null);
      setExpandedWeekNotes({});
      return;
    }

    setLearningWeeks(buildLearningWeekConfigs(termWeekCount));
    setExpandedLearningWeek(1);
    setExpandedWeekNotes({});
  }, [selectedTermId, termWeekCount]);

  const updateLearningWeek = (
    weekNumber: number,
    updater: (current: CreateSchemeWeekConfig) => CreateSchemeWeekConfig,
  ) => {
    setExpandedLearningWeek(weekNumber);
    setLearningWeeks((current) =>
      current.map((week) => (week.week_number === weekNumber ? updater(week) : week)),
    );
  };

  const exceptionalWeekPreview = useMemo(() => {
    if (!selectedTerm) {
      return {
        exceptionalWeeks: [] as ExceptionalWeekInput[],
        notes: {} as SchemeNonBlockingExamNotes,
        error: null as string | null,
      };
    }

    const exceptionalWeeks: ExceptionalWeekInput[] = learningWeeks
      .filter((week) => week.week_type !== 'TEACHING')
      .map((week) => ({
        week_number: week.week_number,
        week_type: week.week_type,
        affects_learning: week.affects_learning,
        label: getSchemeWeekTypeLabel(week.week_type),
        notes: week.notes.trim(),
      }));

    return {
      exceptionalWeeks,
      notes: {
        entry_exam_available: learningWeeks.some((week) => week.week_type === 'ENTRY_EXAM'),
        entry_exam_affects_learning: learningWeeks.some(
          (week) => week.week_type === 'ENTRY_EXAM' && week.affects_learning,
        ),
        exit_exam_available: learningWeeks.some((week) => week.week_type === 'EXIT_EXAM'),
        exit_exam_affects_learning: learningWeeks.some(
          (week) => week.week_type === 'EXIT_EXAM' && week.affects_learning,
        ),
      },
      error: null,
    };
  }, [learningWeeks, selectedTerm]);

  const learningWeekSummary = useMemo(
    () => summarizeLearningWeeks(termWeekCount, exceptionalWeekPreview.exceptionalWeeks),
    [exceptionalWeekPreview.exceptionalWeeks, termWeekCount],
  );

  const lessonsPerWeekValue = useMemo(
    () => parseIntegerInput(lessonsPerWeek),
    [lessonsPerWeek],
  );

  const lessonDurationMinutesValue = useMemo(
    () => parseIntegerInput(lessonDurationMinutes),
    [lessonDurationMinutes],
  );

  const totalPlannedLessons = useMemo(
    () => learningWeekSummary.activeLearningWeekCount * (lessonsPerWeekValue ?? 0),
    [learningWeekSummary.activeLearningWeekCount, lessonsPerWeekValue],
  );

  const rangeValidation = useMemo(() => {
    if (!startSubStrandId || !endSubStrandId) {
      return {
        error: 'Choose the first and last topic to cover.',
        warning: null as string | null,
        curriculumRange: null as CurriculumRangeInput | null,
      };
    }

    const start = flattenedSubStrands.find((item) => String(item.subStrandId) === startSubStrandId);
    const end = flattenedSubStrands.find((item) => String(item.subStrandId) === endSubStrandId);

    if (!start || !end) {
      return {
        error: 'The selected strand range could not be resolved.',
        warning: null,
        curriculumRange: null,
      };
    }

    return {
      error: null,
      warning:
        start.order > end.order
          ? 'Your selected end topic appears earlier in the curriculum order. This is allowed when your teaching plan needs a custom sequence.'
          : null,
      curriculumRange: {
        start_strand_id: start.strandId,
        start_substrand_id: start.subStrandId,
        end_strand_id: end.strandId,
        end_substrand_id: end.subStrandId,
      },
    };
  }, [endSubStrandId, flattenedSubStrands, startSubStrandId]);

  const generationSetupFingerprint = useMemo(
    () =>
      JSON.stringify({
        selectedCurriculumId,
        selectedSubjectId,
        selectedLevelLabel,
        selectedCohortSubjectId,
        selectedTermId,
        selectedTeacherId,
        title,
        learningWeeks,
        lessonsPerWeek,
        lessonDurationMinutes,
        weeklyTeachingLoadConfirmed,
        startStrandId,
        startSubStrandId,
        endStrandId,
        endSubStrandId,
      }),
    [
      endStrandId,
      endSubStrandId,
      learningWeeks,
      lessonDurationMinutes,
      lessonsPerWeek,
      selectedCohortSubjectId,
      selectedCurriculumId,
      selectedLevelLabel,
      selectedSubjectId,
      selectedTeacherId,
      selectedTermId,
      startStrandId,
      startSubStrandId,
      title,
      weeklyTeachingLoadConfirmed,
    ],
  );
  const previousGenerationSetupFingerprint = useRef(generationSetupFingerprint);

  useEffect(() => {
    if (previousGenerationSetupFingerprint.current === generationSetupFingerprint) {
      return;
    }

    previousGenerationSetupFingerprint.current = generationSetupFingerprint;

    if (!generationFailure) {
      return;
    }

    setGenerationFailure(null);
    clearError();
  }, [
    clearError,
    generationFailure,
    generationSetupFingerprint,
  ]);

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
      if (!resolvedSelectedCohortSubjectId || Number.isNaN(resolvedSelectedCohortSubjectId)) {
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
      if (exceptionalWeekPreview.error) {
        return exceptionalWeekPreview.error;
      }
      if (learningWeekSummary.activeLearningWeekCount <= 0) {
        return 'There must be at least one active learning week.';
      }
      if (lessonsPerWeekValue === null || lessonsPerWeekValue < 1 || lessonsPerWeekValue > 10) {
        return 'Lessons per week must be between 1 and 10.';
      }
      if (!weeklyTeachingLoadConfirmed) {
        return 'Confirm the weekly teaching periods for this subject before continuing.';
      }
      if (
        lessonDurationMinutesValue === null ||
        lessonDurationMinutesValue < 20 ||
        lessonDurationMinutesValue > 120
      ) {
        return 'Lesson duration must be between 20 and 120 minutes.';
      }
      return null;
    }

    if (step === 3) {
      if (strandsError) {
        return strandsError;
      }
      if (flattenedSubStrands.length === 0) {
        return NO_REGISTERED_STRAND_RANGE_MESSAGE;
      }
      return rangeValidation.error;
    }

    return null;
  };

  const loading =
    curriculaLoading ||
    termsLoading ||
    subjectsLoading ||
    adminContextLoading ||
    adminTeachersLoading ||
    (currentStep === 3 && strandsLoading);

  const handleNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      setStepError(error);
      return;
    }

    setStepError(null);
    setGenerationFailure(null);
    clearError();
    setCurrentStep((step) => Math.min(step + 1, 4));
  };

  const handleBack = () => {
    setStepError(null);
    setGenerationFailure(null);
    clearError();
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const handleGenerate = async () => {
    const validationError = validateStep(1) || validateStep(2) || validateStep(3);
    if (validationError) {
      setStepError(validationError);
      return;
    }

    if (!selectedTerm || !resolvedSelectedCohortSubjectId || !rangeValidation.curriculumRange) {
      setStepError('Complete the draft scheme setup before generating.');
      return;
    }

    try {
      setStepError(null);
      setGenerationFailure(null);
      clearError();

      const payload: GenerateSchemePayload = {
        term: Number(selectedTermId),
        cohort_subject: resolvedSelectedCohortSubjectId,
        title: title.trim(),
        lessons_per_week: lessonsPerWeekValue ?? 1,
        lesson_duration_minutes: lessonDurationMinutesValue ?? 40,
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
      setGenerationFailure(
        err instanceof Error ? err.message : 'We could not generate the draft scheme.',
      );
    }
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--assistant-widget-offset', '6rem');

    return () => {
      document.documentElement.style.removeProperty('--assistant-widget-offset');
    };
  }, []);

  const assistantContext = useMemo(
    () => ({
      pageKey: 'schemes.create',
      pageTitle: 'Create Draft Scheme',
      state: {
        is_loading: loading,
        assistant_default_mode: 'minimized',
        assistant_desktop_side: 'left',
        current_step: currentStep,
        term_week_count: termWeekCount,
        active_learning_weeks: learningWeekSummary.activeLearningWeekCount,
        lessons_per_week: lessonsPerWeekValue,
        total_planned_lessons: totalPlannedLessons,
        range_touched: rangeTouched,
      },
      workflowStep:
        currentStep === 1
          ? 'teaching-context'
          : currentStep === 2
            ? 'learning-weeks'
            : currentStep === 3
              ? 'strand-range'
              : 'review-and-generate',
    }),
    [
      currentStep,
      learningWeekSummary.activeLearningWeekCount,
      lessonsPerWeekValue,
      loading,
      rangeTouched,
      termWeekCount,
      totalPlannedLessons,
    ],
  );

  useAssistantPageContext(assistantContext);

  if (loading && currentStep === 1) {
    return <LoadingSpinner message="Loading scheme setup..." fullScreen={false} />;
  }

  if (adminContextError) {
    return <ErrorState message={adminContextError} fullScreen={false} />;
  }

  const visibleError = generationFailure ? null : stepError || generateError || null;

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
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
        <StepMarker currentStep={currentStep} step={2} title="Weeks & Load" />
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
                ...Array.from(
                  new Map(
                    curriculumFilteredContexts.map((option) => [
                      option.subjectId,
                      {
                        value: String(option.subjectId),
                        label: option.subjectName,
                      },
                    ]),
                  ).values(),
                ),
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
                ...Array.from(
                  new Set(levelFilteredContexts.map((option) => option.levelLabel)),
                ).map((levelLabel) => ({
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
                options={[{ value: '', label: 'Select teacher' }, ...teacherOptions]}
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
                    {selectedTerm.name} runs from{' '}
                    {formatDateRange(selectedTerm.start_date, selectedTerm.end_date)}. The draft
                    will use {termWeekCount} term weeks from the server term dates.
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
            <h2 className="text-lg font-semibold theme-text">
              Step 2: Set learning weeks and teaching load
            </h2>
            <p className="mt-1 text-sm theme-subtle">
              Mark only the weeks that break the normal teaching flow, then confirm how many times
              this subject meets each active week.
            </p>
          </div>

          {selectedTerm ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Total term weeks
                  </p>
                  <p className="mt-1 text-base font-semibold theme-text">{termWeekCount}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Active learning weeks
                  </p>
                  <p className="mt-1 text-base font-semibold theme-text">
                    {learningWeekSummary.activeLearningWeekCount}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Lessons per week
                  </p>
                  <p className="mt-1 text-base font-semibold theme-text">
                    {lessonsPerWeekValue ?? 'Not set'}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Total planned lessons
                  </p>
                  <p className="mt-1 text-base font-semibold theme-text">{totalPlannedLessons}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Exceptional weeks
                  </p>
                  <p className="mt-1 text-base font-semibold theme-text">
                    {exceptionalWeekPreview.exceptionalWeeks.length}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Weekly teaching periods</p>
                    <p className="mt-1">
                      Different subjects meet different numbers of times per week. Mathematics may
                      meet 5 times, while Computer Studies may meet 3 times. This controls how
                      many lesson rows are created in each active week.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-2">
                  <Input
                    label="Weekly teaching periods / lessons per week"
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    value={lessonsPerWeek}
                    onChange={(event) => {
                      setLessonsPerWeek(event.target.value);
                      setWeeklyTeachingLoadConfirmed(false);
                    }}
                  />
                  <p className="text-sm theme-subtle">
                    Set this deliberately even if the subject meets once per week.
                  </p>
                </div>

                <div className="space-y-2">
                  <Input
                    label="Lesson duration in minutes"
                    type="number"
                    min={20}
                    max={120}
                    step={5}
                    value={lessonDurationMinutes}
                    onChange={(event) => setLessonDurationMinutes(event.target.value)}
                  />
                  <p className="text-sm theme-subtle">
                    This snapshot is stored with the generated scheme for future reference.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border theme-border bg-gray-50 px-4 py-3 text-sm theme-text">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={weeklyTeachingLoadConfirmed}
                  onChange={(event) => setWeeklyTeachingLoadConfirmed(event.target.checked)}
                />
                <span>
                  I confirm this subject should generate {lessonsPerWeekValue ?? lessonsPerWeek}{' '}
                  lesson row{lessonsPerWeekValue === 1 ? '' : 's'} in each active week.
                </span>
              </label>

              <div className="space-y-3">
                {learningWeeks.map((week) => {
                  const expanded = expandedLearningWeek === week.week_number;
                  const noteOpen = expandedWeekNotes[week.week_number] ?? false;
                  const exceptional = week.week_type !== 'TEACHING';

                  return (
                    <div
                      key={week.week_number}
                      className="overflow-hidden rounded-xl border theme-border"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLearningWeek((current) =>
                            current === week.week_number ? null : week.week_number,
                          )
                        }
                        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold theme-text">
                              Week {week.week_number}
                            </p>
                            <Badge variant={exceptional ? 'warning' : 'success'} size="sm">
                              {getSchemeWeekTypeLabel(week.week_type)}
                            </Badge>
                            <Badge
                              variant={week.affects_learning ? 'warning' : 'default'}
                              size="sm"
                            >
                              {week.affects_learning ? 'Affects learning' : 'Keeps learning active'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm theme-subtle">
                            {week.notes.trim() ? week.notes : 'No note added'}
                          </p>
                        </div>
                        {expanded ? (
                          <ChevronUp className="h-5 w-5 theme-subtle" />
                        ) : (
                          <ChevronDown className="h-5 w-5 theme-subtle" />
                        )}
                      </button>

                      {expanded ? (
                        <div className="space-y-4 border-t theme-border px-4 py-4">
                          <div className="grid gap-4 xl:grid-cols-2">
                            <Select
                              label="Week type"
                              value={week.week_type}
                              onChange={(event) =>
                                updateLearningWeek(week.week_number, (current) => ({
                                  ...current,
                                  week_type: event.target.value as SchemeWeekType,
                                  affects_learning:
                                    event.target.value === 'TEACHING'
                                      ? false
                                      : current.affects_learning,
                                }))
                              }
                              options={CREATE_WEEK_TYPE_OPTIONS}
                            />

                            <Select
                              label="Affects learning"
                              value={String(week.affects_learning)}
                              onChange={(event) =>
                                updateLearningWeek(week.week_number, (current) => ({
                                  ...current,
                                  affects_learning: event.target.value === 'true',
                                }))
                              }
                              disabled={week.week_type === 'TEACHING'}
                              options={[
                                { value: 'false', label: 'No, keep active learning' },
                                { value: 'true', label: 'Yes, reduce active learning' },
                              ]}
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpandedWeekNotes((current) => ({
                                  ...current,
                                  [week.week_number]: !noteOpen,
                                }))
                              }
                            >
                              {noteOpen ? 'Hide note' : 'Add note'}
                            </Button>
                          </div>

                          {noteOpen ? (
                            <TextAreaField
                              label="Week note"
                              value={week.notes}
                              onChange={(event) =>
                                updateLearningWeek(week.week_number, (current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }))
                              }
                              rows={3}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </Card>
      ) : null}

      {currentStep === 3 ? (
        <Card className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold theme-text">Step 3: Select curriculum range</h2>
            <p className="mt-1 text-sm theme-subtle">
              Choose the topics this scheme should cover. You can start from any strand or
              sub-strand and end at any topic that fits your teaching plan.
            </p>
          </div>

          {strandsError ? (
            <ErrorState message={strandsError} fullScreen={false} />
          ) : flattenedSubStrands.length === 0 ? (
            <div className="rounded-xl border theme-border bg-gray-50 px-4 py-5 text-sm theme-subtle">
              {NO_REGISTERED_STRAND_RANGE_MESSAGE}
            </div>
          ) : (
            <div className="space-y-4">
              {rangeValidation.warning ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {rangeValidation.warning}
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="space-y-4">
                  <h3 className="text-base font-semibold theme-text">First topic to cover</h3>
                  <Select
                    label="First Strand"
                    value={startStrandId}
                    onChange={(event) => {
                      const nextStrandId = event.target.value;
                      setRangeTouched(true);
                      setStartStrandId(nextStrandId);
                      setStartSubStrandId(resolveSubStrandIdForStrand(nextStrandId, 'first'));
                    }}
                    options={[{ value: '', label: 'Select first strand' }, ...startStrandOptions]}
                  />
                  <Select
                    label="First Sub-strand"
                    value={startSubStrandId}
                    onChange={(event) => {
                      setRangeTouched(true);
                      setStartSubStrandId(event.target.value);
                    }}
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
                      const nextStrandId = event.target.value;
                      setRangeTouched(true);
                      setEndStrandId(nextStrandId);
                      setEndSubStrandId(resolveSubStrandIdForStrand(nextStrandId, 'last'));
                    }}
                    options={[{ value: '', label: 'Select last strand' }, ...endStrandOptions]}
                  />
                  <Select
                    label="Last Sub-strand"
                    value={endSubStrandId}
                    onChange={(event) => {
                      setRangeTouched(true);
                      setEndSubStrandId(event.target.value);
                    }}
                    options={[{ value: '', label: 'Select last sub-strand' }, ...endSubStrandOptions]}
                  />
                </Card>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {generationFailure ? (
        <Card className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold theme-text">Draft scheme generation failed</h2>
            <p className="mt-1 text-sm theme-subtle">{generationFailure}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="button" onClick={() => void handleGenerate()} disabled={submitting}>
              {submitting ? 'Retrying...' : 'Retry generation'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setGenerationFailure(null);
                clearError();
                setCurrentStep(3);
              }}
            >
              Back to strand range
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setGenerationFailure(null);
                clearError();
                setCurrentStep(2);
              }}
            >
              Back to teaching load
            </Button>
            <Link href="/schemes">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setGenerationFailure(null);
                  clearError();
                }}
              >
                Back to schemes
              </Button>
            </Link>
          </div>
        </Card>
      ) : currentStep === 4 ? (
        <Card className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold theme-text">Step 4: Review and generate</h2>
            <p className="mt-1 text-sm theme-subtle">
              Confirm the draft scheme setup before generating the editable table.
            </p>
          </div>

          <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Curriculum
              </dt>
              <dd className="mt-1 text-sm theme-text">
                {selectedCurriculum?.name ?? 'Not selected'}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Subject</dt>
              <dd className="mt-1 text-sm theme-text">{selectedSubjectLabel}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Level / Grade
              </dt>
              <dd className="mt-1 text-sm theme-text">{selectedLevelLabel || 'Not selected'}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Teaching Term
              </dt>
              <dd className="mt-1 text-sm theme-text">{selectedTerm?.name ?? 'Not selected'}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Total term weeks
              </dt>
              <dd className="mt-1 text-sm theme-text">{termWeekCount}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Active weeks
              </dt>
              <dd className="mt-1 text-sm theme-text">
                {learningWeekSummary.activeLearningWeekCount}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Lessons per week
              </dt>
              <dd className="mt-1 text-sm theme-text">{lessonsPerWeekValue ?? 'Not set'}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Lesson duration
              </dt>
              <dd className="mt-1 text-sm theme-text">
                {lessonDurationMinutesValue ?? 'Not set'} minutes
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Total planned lessons
              </dt>
              <dd className="mt-1 text-sm theme-text">{totalPlannedLessons}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Exceptional weeks
              </dt>
              <dd className="mt-1 text-sm theme-text">
                {exceptionalWeekPreview.exceptionalWeeks.length === 0
                  ? 'None'
                  : exceptionalWeekPreview.exceptionalWeeks
                      .map(
                        (week) =>
                          `Week ${week.week_number} (${getSchemeWeekTypeLabel(week.week_type)})`,
                      )
                      .join(', ')}
              </dd>
            </div>
          </dl>

          <div className="rounded-xl border theme-border bg-gray-50 px-4 py-4">
            <p className="text-sm font-medium theme-text">Strand Range</p>
            <p className="mt-1 text-sm theme-subtle">
              {
                flattenedSubStrands.find((item) => String(item.subStrandId) === startSubStrandId)
                  ?.strandName
              }
              {' • '}
              {
                flattenedSubStrands.find((item) => String(item.subStrandId) === startSubStrandId)
                  ?.subStrandName
              }
              {'  '}to{'  '}
              {
                flattenedSubStrands.find((item) => String(item.subStrandId) === endSubStrandId)
                  ?.strandName
              }
              {' • '}
              {
                flattenedSubStrands.find((item) => String(item.subStrandId) === endSubStrandId)
                  ?.subStrandName
              }
            </p>
            {rangeValidation.warning ? (
              <p className="mt-3 text-sm text-amber-700">{rangeValidation.warning}</p>
            ) : null}
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
          disabled={(currentStep === 1 && !generationFailure) || submitting}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row">
          {generationFailure ? null : currentStep < 4 ? (
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

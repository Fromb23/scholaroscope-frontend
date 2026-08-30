'use client';

import { resolveErrorMessage } from '@/app/core/errors';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { parseAppDestination } from '@/app/core/auth/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
import { schemesAPI } from '@/app/core/api/schemes';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { instructorsAPI } from '@/app/core/api/instructors';
import { useAcademicLifecycleContext, useTermCalendarEvents, useCurricula, useSubjects } from '@/app/core/hooks/useAcademic';
import { useGenerateScheme, useSchemeSubjectStrands } from '@/app/core/hooks/useSchemes';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { isSelfManagedTeachingAdmin } from '@/app/core/lib/workspaces';
import type { PaginatedResponse } from '@/app/core/types/api';
import type { CohortSubject, Curriculum, Subject, Term } from '@/app/core/types/academic';
import { useAuth } from '@/app/context/AuthContext';
import type {
  CurriculumRangeInput,
  GenerateSchemePayload,
} from '@/app/core/types/schemes';
import {
  buildDefaultSchemeTitle,
  buildSchemeTermCalendarSetupHref,
  buildSchemeWeeksFromTermCalendar,
  calculateTermWeekCount,
  flattenSubjectStrands,
  formatDateRange,
  getSchemeWeekTypeLabel,
  resolveSchemeTermCalendarState,
  summarizeSchemeWeeks,
  validateCreateSchemeStep,
  type CreateSchemeStep,
  type CreateSchemeValidationFailure,
  type CreateSchemeValidationResult,
  type CreateSchemeValidationTarget,
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
const NO_REGISTERED_STRAND_RANGE_MESSAGE =
  "No strand range is registered for this class subject yet. Register the subject's sub-strands in curriculum setup before generating a scheme.";
const TERM_SETUP_INCOMPLETE_MESSAGE =
  'Your admin needs to complete the term calendar before schemes can be generated.';
export const SELF_MANAGED_TERM_SETUP_INCOMPLETE_MESSAGE =
  'Complete or review your term calendar before generating this scheme.';
const ADMIN_TERM_SETUP_MESSAGE =
  'Complete the term calendar in term setup before generating schemes of work.';
const STEP_ERROR_ID = 'create-scheme-step-error';
const CREATE_SCHEME_TARGET_ELEMENT_IDS: Record<CreateSchemeValidationTarget, string> = {
  curriculum: 'create-scheme-curriculum',
  subject: 'create-scheme-subject',
  level: 'create-scheme-level',
  'cohort-subject': 'create-scheme-cohort-subject',
  'term-status': 'create-scheme-term-status',
  title: 'create-scheme-title',
  'term-calendar': 'create-scheme-term-calendar-status',
  'lessons-per-week': 'create-scheme-lessons-per-week',
  'weekly-load-confirmation': 'create-scheme-weekly-load-confirmation',
  'lesson-duration': 'create-scheme-lesson-duration',
  'strand-range-status': 'create-scheme-strand-range-status',
  'start-strand': 'create-scheme-start-strand',
  'start-substrand': 'create-scheme-start-substrand',
  'end-strand': 'create-scheme-end-strand',
  'end-substrand': 'create-scheme-end-substrand',
  'generation-status': 'create-scheme-generation-status',
};

export function getSchemeTermCalendarSetupMessage(params: {
  selectedTerm: Pick<Term, 'configuration_state' | 'configuration_locked_reason'> | null;
  selfManagedTeachingAdmin: boolean;
  isTeachingActor: boolean;
}): string | null {
  if (!params.selectedTerm) {
    return null;
  }
  if (params.selectedTerm.configuration_state === 'SETUP_LOCKED') {
    return null;
  }
  if (params.selectedTerm.configuration_state === 'HISTORICAL_LOCKED') {
    return params.selectedTerm.configuration_locked_reason ?? 'Historical terms stay read-only.';
  }
  if (params.selfManagedTeachingAdmin) {
    return SELF_MANAGED_TERM_SETUP_INCOMPLETE_MESSAGE;
  }
  return params.isTeachingActor ? TERM_SETUP_INCOMPLETE_MESSAGE : ADMIN_TERM_SETUP_MESSAGE;
}

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

function parseIntegerInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function focusValidationTarget(target: CreateSchemeValidationTarget) {
  const element = document.getElementById(CREATE_SCHEME_TARGET_ELEMENT_IDS[target]);
  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });

  if (element instanceof HTMLElement) {
    element.focus({ preventScroll: true });
  }
}

export function CreateSchemePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeOperatingContext, activeOrg, capabilities, user } = useAuth();
  const teachingSurface = activeOperatingContext === 'MY_TEACHING' && Boolean(capabilities.can_teach);
  const selfManagedTeachingAdmin = isSelfManagedTeachingAdmin({
    activeOrg,
    capabilities,
    user,
  });
  const isTeachingActor = teachingSurface || selfManagedTeachingAdmin;
  const isInstitutionalAdmin = activeOperatingContext === 'WORKSPACE_MANAGEMENT' && !selfManagedTeachingAdmin;
  const { curricula, loading: curriculaLoading } = useCurricula();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const instructorAccess = useInstructorCohortAccess();
  const { generateScheme, submitting, error: generateError, clearError } = useGenerateScheme();

  const [adminCohortSubjects, setAdminCohortSubjects] = useState<CohortSubject[]>([]);
  const [adminContextLoading, setAdminContextLoading] = useState(false);
  const [adminContextError, setAdminContextError] = useState<string | null>(null);
  const [adminTeachers, setAdminTeachers] = useState<Array<{ id: number; label: string }>>([]);
  const [adminTeachersLoading, setAdminTeachersLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<CreateSchemeStep>(1);
  const [stepError, setStepError] = useState<CreateSchemeValidationFailure | null>(null);
  const [validationFocusRequest, setValidationFocusRequest] = useState(0);
  const [generationFocusRequest, setGenerationFocusRequest] = useState(0);

  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedLevelLabel, setSelectedLevelLabel] = useState('');
  const [selectedCohortSubjectId, setSelectedCohortSubjectId] = useState('');
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<number[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
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
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [asyncGenerating, setAsyncGenerating] = useState(false);
  const safeReturnTo = useMemo(() => {
    const value = searchParams.get('returnTo');
    return parseAppDestination(value);
  }, [searchParams]);

  useEffect(() => {
    if (isTeachingActor || isInstitutionalAdmin) {
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
  }, [isTeachingActor, isInstitutionalAdmin]);

  useEffect(() => {
    const requestedCohortSubjectId = searchParams.get('cohort_subject');

    if (requestedCohortSubjectId && !selectedCohortSubjectId) {
      setSelectedCohortSubjectId(requestedCohortSubjectId);
    }
  }, [searchParams, selectedCohortSubjectId]);

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
    if (isTeachingActor) {
      return instructorAccess.assignments
        .filter((assignment) => (
          typeof assignment.cohort_subject_id === 'number'
          && assignment.subject_offering_status !== 'DROPPED_HISTORICAL'
        ))
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
  }, [adminCohortSubjects, instructorAccess.assignments, isTeachingActor, subjectById]);

  useEffect(() => {
    if (activeCurricula.length === 1 && !selectedCurriculumId) {
      setSelectedCurriculumId(String(activeCurricula[0].id));
    }
  }, [activeCurricula, selectedCurriculumId]);

  useEffect(() => {
    if (isTeachingActor && contextOptions.length === 1 && !selectedCohortSubjectId) {
      const [option] = contextOptions;
      setSelectedCurriculumId(option.curriculumId ? String(option.curriculumId) : '');
      setSelectedSubjectId(String(option.subjectId));
      setSelectedLevelLabel(option.levelLabel);
      setSelectedCohortSubjectId(String(option.cohortSubjectId));
    }
  }, [contextOptions, isTeachingActor, selectedCohortSubjectId]);

  useEffect(() => {
    if (isTeachingActor && user && !selectedTeacherId) {
      setSelectedTeacherId(String(user.id));
    }
  }, [isTeachingActor, selectedTeacherId, user]);

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

  useEffect(() => {
    if (resolvedSelectedCohortSubjectId) {
      setSelectedApplicationIds((current) => Array.from(new Set([
        resolvedSelectedCohortSubjectId,
        ...current,
      ])));
    }
  }, [resolvedSelectedCohortSubjectId]);
  const {
    data: academicContext,
    isLoading: academicContextLoading,
    error: academicContextError,
  } = useAcademicLifecycleContext({
    cohortSubjectId: resolvedSelectedCohortSubjectId,
    enabled: Boolean(resolvedSelectedCohortSubjectId),
    refetchOnMount: 'always',
  });

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
    () => academicContext?.term ?? academicContext?.active_term ?? academicContext?.current_term ?? null,
    [academicContext],
  );

  const {
    events: termCalendarEvents,
    loading: termCalendarLoading,
    error: termCalendarError,
  } = useTermCalendarEvents(selectedTerm ? selectedTerm.id : null);

  useEffect(() => {
    if (titleTouched) {
      return;
    }

    const defaultTitle = buildDefaultSchemeTitle({
      subjectName: selectedContext?.subjectName ?? selectedSubject?.name,
      levelLabel: selectedContext?.levelLabel ?? selectedLevelLabel,
      termName: selectedTerm?.name,
      academicYearName: selectedTerm?.academic_year_name,
    });

    if (!defaultTitle) {
      return;
    }

    setTitle(defaultTitle);
  }, [selectedContext, selectedLevelLabel, selectedSubject?.name, selectedTerm, titleTouched]);

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
    ? selectedTerm.week_count || calculateTermWeekCount(selectedTerm.start_date, selectedTerm.end_date)
    : 0;

  const derivedWeeks = useMemo(
    () => (selectedTerm ? buildSchemeWeeksFromTermCalendar(selectedTerm, termCalendarEvents) : []),
    [selectedTerm, termCalendarEvents],
  );

  const exceptionalWeeks = useMemo(
    () => derivedWeeks.filter((week) => week.week_type !== 'TEACHING'),
    [derivedWeeks],
  );

  const learningWeekSummary = useMemo(
    () => summarizeSchemeWeeks(derivedWeeks),
    [derivedWeeks],
  );

  const termCalendarSetupMessage = useMemo(() => {
    return getSchemeTermCalendarSetupMessage({
      selectedTerm,
      selfManagedTeachingAdmin,
      isTeachingActor,
    });
  }, [isTeachingActor, selectedTerm, selfManagedTeachingAdmin]);
  const canManageCalendar = selfManagedTeachingAdmin || !isTeachingActor;
  const termCalendarState = useMemo(() => (
    selectedTerm
      ? resolveSchemeTermCalendarState({
          selectedTerm,
          canManageCalendar,
          selfManagedTeachingAdmin,
          setupMessage: termCalendarSetupMessage,
        })
      : null
  ), [canManageCalendar, selectedTerm, selfManagedTeachingAdmin, termCalendarSetupMessage]);
  const currentSchemeCreationHref = useMemo(() => {
    const query = searchParams.toString();
    return `${pathname || '/schemes/new'}${query ? `?${query}` : ''}`;
  }, [pathname, searchParams]);
  const termCalendarSetupHref = useMemo(() => (
    buildSchemeTermCalendarSetupHref({
      currentSchemeHref: currentSchemeCreationHref,
      selectedTermId: selectedTerm?.id ?? null,
    })
  ), [currentSchemeCreationHref, selectedTerm?.id]);

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
        selectedTermId: selectedTerm?.id ?? null,
        selectedTeacherId,
        title,
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
      lessonDurationMinutes,
      lessonsPerWeek,
      selectedCohortSubjectId,
      selectedCurriculumId,
      selectedLevelLabel,
      selectedSubjectId,
      selectedTeacherId,
      selectedTerm?.id,
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

  const validateStep = useCallback((step: CreateSchemeStep): CreateSchemeValidationResult => {
    return validateCreateSchemeStep({
      step,
      hasSelectedCurriculum: Boolean(selectedCurriculum),
      hasSelectedSubject: Boolean(resolvedSelectedSubjectId && !Number.isNaN(resolvedSelectedSubjectId)),
      hasSelectedLevel: Boolean(selectedLevelLabel),
      hasSelectedCohortSubject: Boolean(
        resolvedSelectedCohortSubjectId && !Number.isNaN(resolvedSelectedCohortSubjectId),
      ),
      hasSelectedTerm: Boolean(selectedTerm),
      hasTitle: Boolean(title.trim()),
      noActiveTermMessage: academicContext?.message,
      termCalendarIsComplete: selectedTerm?.configuration_state === 'SETUP_LOCKED',
      termCalendarSetupMessage,
      activeLearningWeekCount: learningWeekSummary.activeLearningWeekCount,
      lessonsPerWeekValue,
      weeklyTeachingLoadConfirmed,
      lessonDurationMinutesValue,
      strandsError,
      flattenedSubStrandCount: flattenedSubStrands.length,
      rangeError: rangeValidation.error,
      hasStartStrand: Boolean(startStrandId),
      hasStartSubStrand: Boolean(startSubStrandId),
      hasEndStrand: Boolean(endStrandId),
      hasEndSubStrand: Boolean(endSubStrandId),
      hasCurriculumRange: Boolean(rangeValidation.curriculumRange),
    });
  }, [
    academicContext?.message,
    endStrandId,
    endSubStrandId,
    flattenedSubStrands.length,
    learningWeekSummary.activeLearningWeekCount,
    lessonDurationMinutesValue,
    lessonsPerWeekValue,
    rangeValidation.curriculumRange,
    rangeValidation.error,
    resolvedSelectedCohortSubjectId,
    resolvedSelectedSubjectId,
    selectedCurriculum,
    selectedLevelLabel,
    selectedTerm,
    startStrandId,
    startSubStrandId,
    strandsError,
    termCalendarSetupMessage,
    title,
    weeklyTeachingLoadConfirmed,
  ]);

  const handleValidationFailure = useCallback((failure: CreateSchemeValidationFailure) => {
    setStepError(failure);
    setCurrentStep(failure.step);
    setValidationFocusRequest((request) => request + 1);
  }, []);

  const validateGenerationSetup = useCallback((): CreateSchemeValidationResult => {
    for (const step of [1, 2, 3] as const) {
      const result = validateStep(step);
      if (!result.valid) {
        return result;
      }
    }

    if (!selectedTerm || !resolvedSelectedCohortSubjectId || !rangeValidation.curriculumRange) {
      return {
        valid: false,
        step: 4,
        target: 'generation-status',
        message: 'Complete the draft scheme setup before generating.',
      };
    }

    return { valid: true };
  }, [rangeValidation.curriculumRange, resolvedSelectedCohortSubjectId, selectedTerm, validateStep]);

  const loading =
    curriculaLoading ||
    academicContextLoading ||
    subjectsLoading ||
    adminContextLoading ||
    adminTeachersLoading ||
    (currentStep === 2 && termCalendarLoading) ||
    (currentStep === 3 && strandsLoading);

  const handleNext = () => {
    const result = validateStep(currentStep);
    if (!result.valid) {
      handleValidationFailure(result);
      return;
    }

    setStepError(null);
    setGenerationFailure(null);
    clearError();
    setCurrentStep((step) => Math.min(step + 1, 4) as CreateSchemeStep);
  };

  const handleBack = () => {
    setStepError(null);
    setGenerationFailure(null);
    clearError();
    setCurrentStep((step) => Math.max(step - 1, 1) as CreateSchemeStep);
  };

  const handleGenerate = async () => {
    const validationResult = validateGenerationSetup();
    if (!validationResult.valid) {
      handleValidationFailure(validationResult);
      return;
    }

    if (!selectedTerm || !resolvedSelectedCohortSubjectId || !rangeValidation.curriculumRange) {
      return;
    }

    try {
      setStepError(null);
      setGenerationFailure(null);
      setGenerationStatus(null);
      clearError();
      setAsyncGenerating(true);

      const payload: GenerateSchemePayload = {
        term: selectedTerm.id,
        cohort_subject: resolvedSelectedCohortSubjectId,
        cohort_subject_ids: selectedApplicationIds,
        title: title.trim(),
        lessons_per_week: lessonsPerWeekValue ?? 1,
        lesson_duration_minutes: lessonDurationMinutesValue ?? 40,
        curriculum_range: rangeValidation.curriculumRange,
        generation_mode: 'AI_ASSISTED_DRAFT' as const,
        ...(selectedTeacherId && !isTeachingActor && user && Number(selectedTeacherId) !== user.id
          ? { teacher: Number(selectedTeacherId) }
          : {}),
      };

      const queued = await generateScheme(payload);
      setGenerationStatus(queued.duplicate ? 'Generation already queued.' : 'Queued.');
      let generated = queued;
      for (let attempt = 0; attempt < 90 && generated.status !== 'COMPLETED' && generated.status !== 'FAILED'; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        generated = await schemesAPI.getGenerationJob(queued.job_id);
        setGenerationStatus(
          generated.status === 'PROCESSING'
            ? 'Generating...'
            : generated.status === 'QUEUED'
              ? 'Queued.'
              : generated.status,
        );
      }
      if (generated.status !== 'COMPLETED' || !generated.result_payload.scheme) {
        const detail = typeof generated.error_payload.detail === 'string'
          ? generated.error_payload.detail
          : 'Scheme generation failed. Please retry.';
        throw new Error(detail);
      }
      router.push(`/schemes/${generated.result_payload.scheme.id}?${new URLSearchParams({
        returnTo: safeReturnTo ?? '/schemes',
      }).toString()}`);
    } catch (err) {
      setGenerationFailure(
        resolveErrorMessage(err, 'We could not generate the draft scheme.'),
      );
      setGenerationStatus(null);
      setGenerationFocusRequest((request) => request + 1);
    } finally {
      setAsyncGenerating(false);
    }
  };

  useEffect(() => {
    if (!stepError || validationFocusRequest === 0) {
      return;
    }

    window.requestAnimationFrame(() => {
      focusValidationTarget(stepError.target);
    });
  }, [stepError, validationFocusRequest]);

  useEffect(() => {
    if (!generationFailure || generationFocusRequest === 0) {
      return;
    }

    window.requestAnimationFrame(() => {
      focusValidationTarget('generation-status');
    });
  }, [generationFailure, generationFocusRequest]);

  useEffect(() => {
    if (!stepError) {
      return;
    }

    const result = validateStep(stepError.step);
    if (result.valid) {
      setStepError(null);
    }
  }, [stepError, validateStep]);

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
            ? 'term-calendar'
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

  if (isInstitutionalAdmin) {
    return (
      <Card className="mx-auto max-w-xl space-y-4 p-6 text-center">
        <h1 className="text-xl font-semibold theme-text">Schemes of Work Supervision</h1>
        <p className="text-sm theme-muted">
          Institutional admins supervise generated schemes by class, subject, and instructor progress. Draft scheme creation is reserved for assigned teachers.
        </p>
        <Link href={safeReturnTo ?? '/schemes'}>
          <Button type="button" variant="secondary">Back to supervision</Button>
        </Link>
      </Card>
    );
  }

  if (loading && currentStep === 1) {
    return <LoadingSpinner message="Loading scheme setup..." fullScreen={false} />;
  }

  if (adminContextError) {
    return <ErrorState message={adminContextError} fullScreen={false} />;
  }

  const visibleError = generationFailure ? null : stepError?.message || generateError || null;

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      <div className="flex items-center gap-3">
        <Link href={safeReturnTo ?? '/schemes'}>
          <Button type="button" variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            {safeReturnTo ? 'Back' : 'Back to Schemes'}
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold theme-text">Create Draft Scheme</h1>
        <p className="mt-1 text-sm theme-subtle">
          Set the teaching context, review the term calendar, and choose the strand range before generating the draft.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        <StepMarker currentStep={currentStep} step={1} title="Teaching Context" />
        <StepMarker currentStep={currentStep} step={2} title="Calendar & Load" />
        <StepMarker currentStep={currentStep} step={3} title="Strand Range" />
        <StepMarker currentStep={currentStep} step={4} title="Review & Generate" />
      </div>

      {visibleError ? (
        <ErrorBanner
          id={STEP_ERROR_ID}
          title="Draft scheme setup"
          message={visibleError}
          onDismiss={() => {
            setStepError(null);
            setGenerationFailure(null);
            setGenerationStatus(null);
            clearError();
          }}
        />
      ) : null}

      {generationStatus ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {generationStatus} You can keep this page open while Scholaroscope prepares the scheme.
        </div>
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
              id={CREATE_SCHEME_TARGET_ELEMENT_IDS.curriculum}
              label="Curriculum"
              required
              aria-invalid={stepError?.target === 'curriculum' ? true : undefined}
              aria-describedby={stepError?.target === 'curriculum' ? STEP_ERROR_ID : undefined}
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
              id={CREATE_SCHEME_TARGET_ELEMENT_IDS.subject}
              label="Subject"
              required
              aria-invalid={stepError?.target === 'subject' ? true : undefined}
              aria-describedby={stepError?.target === 'subject' ? STEP_ERROR_ID : undefined}
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
              id={CREATE_SCHEME_TARGET_ELEMENT_IDS.level}
              label="Level / Grade"
              required
              aria-invalid={stepError?.target === 'level' ? true : undefined}
              aria-describedby={stepError?.target === 'level' ? STEP_ERROR_ID : undefined}
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
              id={CREATE_SCHEME_TARGET_ELEMENT_IDS['cohort-subject']}
              label="Class / Subject"
              required
              aria-invalid={stepError?.target === 'cohort-subject' ? true : undefined}
              aria-describedby={stepError?.target === 'cohort-subject' ? STEP_ERROR_ID : undefined}
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

            {resolvedSelectedCohortSubjectId ? (
              <div className="rounded-lg border theme-border p-3 md:col-span-2 xl:col-span-3">
                <p className="text-sm font-medium theme-text">Use this scheme with classes</p>
                <p className="mt-1 text-xs theme-subtle">Choose compatible assigned classes. The server revalidates every choice before applying the scheme.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {filteredContextOptions.map((option) => {
                    const checked = selectedApplicationIds.includes(option.cohortSubjectId);
                    return (
                      <label key={option.cohortSubjectId} className="flex items-center gap-2 text-sm theme-text">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={option.cohortSubjectId === resolvedSelectedCohortSubjectId}
                          onChange={(event) => setSelectedApplicationIds((current) => event.target.checked
                            ? [...current, option.cohortSubjectId]
                            : current.filter((id) => id !== option.cohortSubjectId))}
                        />
                        {option.cohortName} • {option.subjectName}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div
              id={CREATE_SCHEME_TARGET_ELEMENT_IDS['term-status']}
              tabIndex={-1}
              aria-describedby={stepError?.target === 'term-status' ? STEP_ERROR_ID : undefined}
              className="rounded-lg border theme-border theme-surface-elevated px-3 py-2 outline-none"
            >
              <p className="text-xs font-medium theme-subtle">Current teaching term</p>
              {academicContextLoading ? (
                <p className="mt-1 text-sm theme-muted">Resolving from selected class subject…</p>
              ) : selectedTerm ? (
                <div className="mt-1 space-y-1">
                  <p className="text-sm font-semibold theme-text">{selectedTerm.name}</p>
                  <p className="text-xs theme-muted">
                    {formatDateRange(selectedTerm.start_date, selectedTerm.end_date)}
                    {' • '}
                    {termWeekCount} weeks
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-amber-700">
                  {academicContextError instanceof Error
                    ? academicContextError.message
                    : academicContext?.message ?? 'Choose a class subject to resolve the current term.'}
                </p>
              )}
            </div>

            {!isTeachingActor ? (
              <Select
                id="create-scheme-teacher"
                label="Teacher"
                value={selectedTeacherId}
                onChange={(event) => setSelectedTeacherId(event.target.value)}
                options={[{ value: '', label: 'Select teacher' }, ...teacherOptions]}
              />
            ) : null}
          </div>

          <Input
            id={CREATE_SCHEME_TARGET_ELEMENT_IDS.title}
            label="Scheme title"
            required
            aria-invalid={stepError?.target === 'title' ? true : undefined}
            aria-describedby={stepError?.target === 'title' ? STEP_ERROR_ID : undefined}
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
              Step 2: Review term calendar and teaching load
            </h2>
            <p className="mt-1 text-sm theme-subtle">
              {selfManagedTeachingAdmin
                ? 'Your workspace term calendar defines breaks, exams, and holidays for every scheme in this term. Set only the subject-specific teaching load here.'
                : 'The organization term calendar defines breaks, exams, and holidays for every scheme in this term. Set only the subject-specific teaching load here.'}
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
                    Calendar weeks
                  </p>
                  <p className="mt-1 text-base font-semibold theme-text">
                    {exceptionalWeeks.length}
                  </p>
                </div>
              </div>

              {termCalendarState ? (
                <div
                  id={CREATE_SCHEME_TARGET_ELEMENT_IDS['term-calendar']}
                  tabIndex={-1}
                  aria-describedby={stepError?.target === 'term-calendar' ? STEP_ERROR_ID : undefined}
                  className={`rounded-xl border px-4 py-4 text-sm outline-none ${
                    termCalendarState.state === 'READY'
                      ? 'border-green-200 bg-green-50 text-green-900'
                      : termCalendarState.state === 'HISTORICAL'
                        ? 'theme-border bg-gray-50 theme-text'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      {termCalendarState.state === 'READY' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">
                          {termCalendarState.state === 'READY' ? (
                            <>
                              <span aria-hidden="true">✓ </span>
                              {termCalendarState.title}
                            </>
                          ) : (
                            termCalendarState.title
                          )}
                        </p>
                        <p className="mt-1">{termCalendarState.message}</p>
                      </div>
                    </div>
                    {termCalendarState.showConfigurationAction ? (
                      <Link href={termCalendarSetupHref}>
                        <Button type="button" variant="secondary" size="sm">
                          {termCalendarState.actionLabel}
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {termCalendarError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
                  {termCalendarError}
                </div>
              ) : null}

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
                    id={CREATE_SCHEME_TARGET_ELEMENT_IDS['lessons-per-week']}
                    label="Weekly teaching periods / lessons per week"
                    required
                    aria-invalid={stepError?.target === 'lessons-per-week' ? true : undefined}
                    aria-describedby={stepError?.target === 'lessons-per-week' ? STEP_ERROR_ID : undefined}
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
                    id={CREATE_SCHEME_TARGET_ELEMENT_IDS['lesson-duration']}
                    label="Lesson duration in minutes"
                    required
                    aria-invalid={stepError?.target === 'lesson-duration' ? true : undefined}
                    aria-describedby={stepError?.target === 'lesson-duration' ? STEP_ERROR_ID : undefined}
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
                  id={CREATE_SCHEME_TARGET_ELEMENT_IDS['weekly-load-confirmation']}
                  type="checkbox"
                  required
                  aria-invalid={stepError?.target === 'weekly-load-confirmation' ? true : undefined}
                  aria-describedby={stepError?.target === 'weekly-load-confirmation' ? STEP_ERROR_ID : undefined}
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
                {derivedWeeks.map((week) => {
                  const exceptional = week.week_type !== 'TEACHING';

                  return (
                    <div
                      key={week.week_number}
                      className="rounded-xl border theme-border px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold theme-text">Week {week.week_number}</p>
                            <Badge variant={exceptional ? 'warning' : 'success'} size="sm">
                              {getSchemeWeekTypeLabel(week.week_type)}
                            </Badge>
                            <Badge
                              variant={week.affects_learning ? 'warning' : 'default'}
                              size="sm"
                            >
                              {week.affects_learning ? 'Affects learning' : 'Active learning'}
                            </Badge>
                          </div>
                          <p className="text-sm theme-text">
                            {week.label}
                          </p>
                          <p className="text-sm theme-subtle">
                            {week.notes.trim() || 'No additional calendar note'}
                          </p>
                        </div>
                        <div className="text-xs theme-subtle">
                          {exceptional ? 'Locked from term setup' : 'Teaching week'}
                        </div>
                      </div>
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
            <div
              id={CREATE_SCHEME_TARGET_ELEMENT_IDS['strand-range-status']}
              tabIndex={-1}
              aria-describedby={stepError?.target === 'strand-range-status' ? STEP_ERROR_ID : undefined}
              className="outline-none"
            >
              <ErrorState message={strandsError} fullScreen={false} />
            </div>
          ) : flattenedSubStrands.length === 0 ? (
            <div
              id={CREATE_SCHEME_TARGET_ELEMENT_IDS['strand-range-status']}
              tabIndex={-1}
              aria-describedby={stepError?.target === 'strand-range-status' ? STEP_ERROR_ID : undefined}
              className="rounded-xl border theme-border bg-gray-50 px-4 py-5 text-sm theme-subtle outline-none"
            >
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
                    id={CREATE_SCHEME_TARGET_ELEMENT_IDS['start-strand']}
                    label="First Strand"
                    required
                    aria-invalid={stepError?.target === 'start-strand' ? true : undefined}
                    aria-describedby={stepError?.target === 'start-strand' ? STEP_ERROR_ID : undefined}
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
                    id={CREATE_SCHEME_TARGET_ELEMENT_IDS['start-substrand']}
                    label="First Sub-strand"
                    required
                    aria-invalid={stepError?.target === 'start-substrand' ? true : undefined}
                    aria-describedby={stepError?.target === 'start-substrand' ? STEP_ERROR_ID : undefined}
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
                    id={CREATE_SCHEME_TARGET_ELEMENT_IDS['end-strand']}
                    label="Last Strand"
                    required
                    aria-invalid={stepError?.target === 'end-strand' ? true : undefined}
                    aria-describedby={stepError?.target === 'end-strand' ? STEP_ERROR_ID : undefined}
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
                    id={CREATE_SCHEME_TARGET_ELEMENT_IDS['end-substrand']}
                    label="Last Sub-strand"
                    required
                    aria-invalid={stepError?.target === 'end-substrand' ? true : undefined}
                    aria-describedby={stepError?.target === 'end-substrand' ? STEP_ERROR_ID : undefined}
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
        <Card
          id={CREATE_SCHEME_TARGET_ELEMENT_IDS['generation-status']}
          role="alert"
          aria-live="polite"
          tabIndex={-1}
          className="space-y-6 outline-none"
        >
          <div>
            <h2 className="text-lg font-semibold theme-text">Draft scheme generation failed</h2>
            <p className="mt-1 text-sm theme-subtle">{generationFailure}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="button" onClick={() => void handleGenerate()} disabled={submitting || asyncGenerating}>
              {submitting || asyncGenerating ? (generationStatus ?? 'Retrying...') : 'Retry generation'}
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
                Calendar event weeks
              </dt>
              <dd className="mt-1 text-sm theme-text">
                {exceptionalWeeks.length === 0
                  ? 'None'
                  : exceptionalWeeks
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
            <Button type="button" onClick={() => void handleGenerate()} disabled={submitting || asyncGenerating}>
              {submitting || asyncGenerating ? (generationStatus ?? 'Queueing...') : 'Generate Draft Scheme'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

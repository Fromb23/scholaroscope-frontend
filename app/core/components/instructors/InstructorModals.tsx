'use client';

// ============================================================================
// app/core/components/instructors/InstructorModals.tsx
//
// All modals for the instructor progress page.
// No any. Typed props. ErrorBanner for errors.
// ============================================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, Check, ChevronDown, Plus, X } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { cohortAPI } from '@/app/core/api/academic';
import { useInstructorDetail } from '@/app/core/hooks/useInstructors';
import { instructorsAPI, type InstructorProfile } from '@/app/core/api/instructors';
import type {
    AvailableCohortSubject,
    CohortAssignModalProps,
    SourceAwareSubjectReference,
    UserUpdatePayload,
} from '@/app/core/types/globalUsers';
import type { TeachingAssignment } from '@/app/core/types/academic';
import type { ApiError } from '@/app/core/types/errors';
import { extractErrorMessage } from '@/app/core/types/errors';
import { isCambridgeCurriculumType } from '@/app/core/lib/curriculumBridge';
import type { CohortSubjectOption } from '@/app/core/types/session';

// ── EditModal ─────────────────────────────────────────────────────────────

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: UserUpdatePayload) => Promise<void>;
    instructor: InstructorProfile;
    submitting: boolean;
}

export function EditModal({ isOpen, onClose, onSubmit, instructor, submitting }: EditModalProps) {
    const [form, setForm] = useState({
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        phone: instructor.phone ?? '',
    });

    useEffect(() => {
        setForm({
            first_name: instructor.first_name,
            last_name: instructor.last_name,
            phone: instructor.phone ?? '',
        });
    }, [instructor, isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Instructor" size="md">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        value={form.first_name}
                        onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                    />
                    <Input
                        label="Last Name"
                        value={form.last_name}
                        onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                    />
                </div>
                <Input
                    label="Phone"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={() => onSubmit(form)} disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── ResetPasswordModal ────────────────────────────────────────────────────

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (pw: string) => Promise<void>;
    submitting: boolean;
}

export function ResetPasswordModal({ isOpen, onClose, onSubmit, submitting }: ResetPasswordModalProps) {
    const [pw, setPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const [err, setErr] = useState('');

    useEffect(() => { if (!isOpen) { setPw(''); setConfirm(''); setErr(''); } }, [isOpen]);

    const handleSubmit = async () => {
        if (pw.length < 8) { setErr('Minimum 8 characters'); return; }
        if (pw !== confirm) { setErr('Passwords do not match'); return; }
        setErr('');
        await onSubmit(pw);
        setPw(''); setConfirm('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reset Password" size="sm">
            <div className="space-y-4">
                <Input
                    label="New Password"
                    type="password"
                    value={pw}
                    onChange={e => { setPw(e.target.value); setErr(''); }}
                />
                <Input
                    label="Confirm Password"
                    type="password"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setErr(''); }}
                    error={err}
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── DeleteModal ───────────────────────────────────────────────────────────

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    name: string;
    submitting: boolean;
}

export function DeleteModal({ isOpen, onClose, onConfirm, name, submitting }: DeleteModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Remove Instructor" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">
                        Delete <strong>{name}</strong>? Their sessions, grades, and activity records will also be removed.
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={submitting}>
                        {submitting ? 'Deleting...' : 'Delete Instructor'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── CohortAssignModal ─────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────

interface ActiveTeachingAssignment extends SourceAwareSubjectReference {
    assignmentKey: string;
    cohortSubjectId: number | null;
    cohortId: number;
    cohortName: string;
    subjectName: string;
    curriculumName: string;
    academicYear: string;
    assignedAt?: string | null;
}

interface SourceAwareSubjectOptionLookup extends SourceAwareSubjectReference {
    cohort_id: number;
    cohort_subject_id: number | null;
}

type SourceAwareSubjectOptionIndex = Map<string, SourceAwareSubjectOptionLookup>;

type SubjectSource = 'cbc' | 'cambridge' | 'kernel';

interface SourceNormalizationContext {
    curriculumType?: string | null;
    isCBC?: boolean;
    legacySubjectId?: number | null;
    enrichment?: Partial<SourceAwareSubjectReference> | null;
    allowSourceSubjectIdAsPluginId?: boolean;
}

function inferSubjectSource(context: SourceNormalizationContext = {}): SubjectSource {
    if (isCambridgeCurriculumType(context.curriculumType)) {
        return 'cambridge';
    }

    if (context.isCBC || context.curriculumType === 'CBE') {
        return 'cbc';
    }

    return 'kernel';
}

function resolveSourceAwareSubjectId(
    subject: SourceAwareSubjectReference,
    legacySubjectId?: number | null,
) {
    return (
        subject.teaching_link_id ??
        subject.cbc_cohort_subject_id ??
        subject.cambridge_cohort_subject_id ??
        subject.subject_id ??
        legacySubjectId ??
        null
    );
}

function buildSubjectOptionLookupKey(
    cohortId: number,
    cohortSubjectId: number,
    source?: string | null,
) {
    return source
        ? `${cohortId}:${cohortSubjectId}:${source}`
        : `${cohortId}:${cohortSubjectId}`;
}

function normalizeSubjectOptionLookupEntry(
    cohortId: number,
    option: CohortSubjectOption,
): SourceAwareSubjectOptionLookup {
    if (option.source === 'cbc') {
        const cbcCohortSubjectId =
            option.teaching_link_id ??
            option.cbc_cohort_subject_id ??
            option.subject_id ??
            null;

        return {
            source: 'cbc',
            subject_id: cbcCohortSubjectId,
            teaching_link_id: cbcCohortSubjectId,
            cbc_cohort_subject_id: cbcCohortSubjectId,
            cambridge_cohort_subject_id: null,
            cohort_id: cohortId,
            cohort_subject_id: option.cohort_subject_id ?? null,
        };
    }

    if (option.source === 'cambridge') {
        const cambridgeCohortSubjectId =
            option.teaching_link_id ??
            option.cambridge_cohort_subject_id ??
            option.subject_id ??
            null;

        return {
            source: 'cambridge',
            subject_id: cambridgeCohortSubjectId,
            teaching_link_id: option.teaching_link_id ?? null,
            cbc_cohort_subject_id: null,
            cambridge_cohort_subject_id: cambridgeCohortSubjectId,
            cohort_id: cohortId,
            cohort_subject_id: option.cohort_subject_id ?? null,
        };
    }

    return {
        source: 'kernel',
        subject_id: option.subject_id ?? null,
        teaching_link_id: option.teaching_link_id ?? null,
        cbc_cohort_subject_id: null,
        cambridge_cohort_subject_id: null,
        cohort_id: cohortId,
        cohort_subject_id: option.cohort_subject_id ?? null,
    };
}

function getSubjectOptionEnrichment(
    index: SourceAwareSubjectOptionIndex,
    cohortId?: number | null,
    cohortSubjectId?: number | null,
    source?: string | null,
) {
    if (typeof cohortId !== 'number' || typeof cohortSubjectId !== 'number') {
        return null;
    }

    if (source) {
        const sourceSpecific = index.get(
            buildSubjectOptionLookupKey(cohortId, cohortSubjectId, source)
        );
        if (sourceSpecific) return sourceSpecific;
    }

    return index.get(buildSubjectOptionLookupKey(cohortId, cohortSubjectId)) ?? null;
}

function normalizeSourceAwareSubjectReference(
    subject: SourceAwareSubjectReference,
    context: SourceNormalizationContext = {},
): SourceAwareSubjectReference {
    const mergedSubject = {
        ...subject,
        ...context.enrichment,
    };
    const source = mergedSubject.source?.trim() || inferSubjectSource(context);
    const cbcCohortSubjectId =
        mergedSubject.cbc_cohort_subject_id ??
        mergedSubject.teaching_link_id ??
        (context.allowSourceSubjectIdAsPluginId ? (mergedSubject.subject_id ?? null) : null);
    const cambridgeCohortSubjectId =
        mergedSubject.cambridge_cohort_subject_id ??
        mergedSubject.teaching_link_id ??
        mergedSubject.subject_id ??
        null;
    const kernelSubjectId =
        mergedSubject.teaching_link_id ??
        mergedSubject.subject_id ??
        context.legacySubjectId ??
        null;
    const subjectId = source === 'cbc'
        ? cbcCohortSubjectId
        : source === 'cambridge'
            ? cambridgeCohortSubjectId
            : kernelSubjectId;

    return {
        ...mergedSubject,
        source,
        subject_id: subjectId,
        teaching_link_id: source === 'cbc'
            ? (mergedSubject.teaching_link_id ?? cbcCohortSubjectId)
            : (mergedSubject.teaching_link_id ?? null),
        cbc_cohort_subject_id: source === 'cbc'
            ? cbcCohortSubjectId
            : (mergedSubject.cbc_cohort_subject_id ?? null),
        cambridge_cohort_subject_id: source === 'cambridge'
            ? cambridgeCohortSubjectId
            : (mergedSubject.cambridge_cohort_subject_id ?? null),
    };
}

function getSourceAwareSubjectId(subject: SourceAwareSubjectReference) {
    return resolveSourceAwareSubjectId(subject);
}

function getSourceAwareSubjectKey(subject: SourceAwareSubjectReference) {
    const source = subject.source?.trim() ?? 'unknown';
    const subjectId = getSourceAwareSubjectId(subject);

    if (typeof subjectId === 'number') {
        return `${source}:${subjectId}`;
    }

    if (typeof subject.cohort_subject_id === 'number') {
        return `${source}:cohort-subject:${subject.cohort_subject_id}`;
    }

    return `${source}:unresolved`;
}

function normalizeTeachingAssignments(
    assignments: TeachingAssignment[],
    subjectOptionIndex: SourceAwareSubjectOptionIndex,
): ActiveTeachingAssignment[] {
    const seen = new Set<string>();
    const normalized: ActiveTeachingAssignment[] = [];

    assignments.forEach((assignment) => {
        const normalizedSubject = normalizeSourceAwareSubjectReference(assignment, {
            curriculumType: assignment.curriculum_type,
            enrichment: getSubjectOptionEnrichment(
                subjectOptionIndex,
                assignment.cohort_id,
                assignment.cohort_subject_id,
                assignment.source,
            ),
            allowSourceSubjectIdAsPluginId: true,
        });
        const assignmentKey = getSourceAwareSubjectKey({
            ...normalizedSubject,
            cohort_subject_id: assignment.cohort_subject_id,
        });
        if (seen.has(assignmentKey)) return;

        seen.add(assignmentKey);
        normalized.push({
            ...assignment,
            ...normalizedSubject,
            assignmentKey,
            cohortSubjectId: assignment.cohort_subject_id ?? null,
            cohortId: assignment.cohort_id,
            cohortName: assignment.cohort_name,
            subjectName: assignment.subject_name,
            curriculumName: assignment.curriculum_name ?? assignment.curriculum_type,
            academicYear: assignment.academic_year,
            assignedAt: assignment.start_date ?? null,
            cohort_subject_id: assignment.cohort_subject_id,
        });
    });

    return normalized;
}

function getActiveTeachingAssignments(
    detail: { teaching_assignments?: TeachingAssignment[] | null } | null | undefined,
    subjectOptionIndex: SourceAwareSubjectOptionIndex,
) {
    return normalizeTeachingAssignments(detail?.teaching_assignments ?? [], subjectOptionIndex);
}

function normalizeAssignableCohortSubject(
    cohortSubject: AvailableCohortSubject,
    subjectOptionIndex: SourceAwareSubjectOptionIndex,
): AvailableCohortSubject {
    const isCambridgeSubject = isCambridgeCurriculumType(cohortSubject.curriculum_type);
    const inferredSource = cohortSubject.source?.trim() || inferSubjectSource({
        curriculumType: cohortSubject.curriculum_type,
    });
    const cohortId = cohortSubject.cohort_id ?? cohortSubject.cohort ?? null;
    const cohortSubjectId = cohortSubject.cohort_subject_id ?? cohortSubject.id ?? null;

    return {
        ...cohortSubject,
        ...normalizeSourceAwareSubjectReference(cohortSubject, {
            curriculumType: cohortSubject.curriculum_type,
            legacySubjectId: inferredSource === 'kernel' && !isCambridgeSubject
                ? (cohortSubject.subject ?? null)
                : null,
            enrichment: getSubjectOptionEnrichment(
                subjectOptionIndex,
                cohortId,
                cohortSubjectId,
                inferredSource,
            ),
        }),
        cohort_subject_id: cohortSubjectId,
    };
}

function getCohortSubjectOptionLines(cohortSubject: AvailableCohortSubject) {
    const contextParts = [
        cohortSubject.academic_year_name ?? cohortSubject.academic_year,
        cohortSubject.curriculum_name ?? cohortSubject.curriculum_type,
    ].filter((value): value is string => Boolean(value && value.trim()));

    return {
        primary: `${cohortSubject.cohort_name} — ${cohortSubject.subject_name}`,
        secondary: contextParts.join(' · '),
    };
}

interface CohortSubjectDropdownProps {
    options: AvailableCohortSubject[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

function CohortSubjectDropdown({
    options,
    value,
    onChange,
    disabled = false,
}: CohortSubjectDropdownProps) {
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const selectedIndex = useMemo(
        () => options.findIndex((option) => getSourceAwareSubjectKey(option) === value),
        [options, value]
    );
    const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
    const selectedOptionLines = selectedOption ? getCohortSubjectOptionLines(selectedOption) : null;

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }, [open, selectedIndex]);

    useEffect(() => {
        if (!open) return;
        optionRefs.current[highlightedIndex]?.focus();
    }, [highlightedIndex, open]);

    const selectOption = (nextValue: string) => {
        onChange(nextValue);
        setOpen(false);
        triggerRef.current?.focus();
    };

    const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled || options.length === 0) return;

        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
            setOpen(true);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : options.length - 1);
            setOpen(true);
        }
    };

    const handleOptionKeyDown = (
        event: React.KeyboardEvent<HTMLButtonElement>,
        index: number,
        optionValue: string,
    ) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((prev) => Math.min(options.length - 1, Math.max(prev, index) + 1));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((prev) => Math.max(0, Math.min(prev, index) - 1));
            return;
        }

        if (event.key === 'Home') {
            event.preventDefault();
            setHighlightedIndex(0);
            return;
        }

        if (event.key === 'End') {
            event.preventDefault();
            setHighlightedIndex(options.length - 1);
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectOption(optionValue);
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
            return;
        }

        if (event.key === 'Tab') {
            setOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full min-w-0">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => !disabled && setOpen((current) => !current)}
                onKeyDown={handleTriggerKeyDown}
                aria-expanded={open}
                aria-haspopup="listbox"
                disabled={disabled}
            className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <div className="min-w-0 flex-1">
                    {selectedOptionLines ? (
                        <>
                            <p className="truncate font-medium text-gray-900">{selectedOptionLines.primary}</p>
                            {selectedOptionLines.secondary && (
                                <p className="truncate text-xs text-gray-500">{selectedOptionLines.secondary}</p>
                            )}
                        </>
                    ) : (
                        <p className="truncate text-gray-500">Select cohort subject...</p>
                    )}
                </div>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && options.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                    <div
                        role="listbox"
                        aria-label="Cohort subject options"
                        className="max-h-64 overflow-y-auto py-1"
                    >
                        {options.map((option, index) => {
                            const optionValue = getSourceAwareSubjectKey(option);
                            const isSelected = optionValue === value;
                            const { primary, secondary } = getCohortSubjectOptionLines(option);

                            return (
                                <button
                                    key={optionValue}
                                    ref={(element) => {
                                        optionRefs.current[index] = element;
                                    }}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => selectOption(optionValue)}
                                    onKeyDown={(event) => handleOptionKeyDown(event, index, optionValue)}
                                    className={`flex w-full min-w-0 items-start gap-3 px-3 py-2 text-left focus:outline-none ${
                                        isSelected || index === highlightedIndex
                                            ? 'bg-blue-50'
                                            : 'bg-white hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-gray-900">
                                            {primary}
                                        </p>
                                        {secondary && (
                                            <p className="truncate text-xs text-gray-500">
                                                {secondary}
                                            </p>
                                        )}
                                    </div>
                                    <Check
                                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                                            isSelected ? 'text-blue-600' : 'text-transparent'
                                        }`}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}


export function CohortAssignModal({
    isOpen, onClose, instructorId, instructorName, onAssignmentsChanged,
}: CohortAssignModalProps) {
    const { instructor: detail, loading, refetch } =
        useInstructorDetail(isOpen ? instructorId : null);

    const [allCohortSubjects, setAllCohortSubjects] = useState<AvailableCohortSubject[]>([]);
    const [subjectOptionIndex, setSubjectOptionIndex] = useState<SourceAwareSubjectOptionIndex>(new Map());
    const [selectedCohortSubject, setSelectedCohortSubject] = useState('');
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unassignReason, setUnassignReason] = useState('MANUAL');
    const [unassignNotes, setUnassignNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    instructorsAPI
      .getAssignableSubjects(instructorId)
      .then(setAllCohortSubjects)
      .catch(() => {});
  }, [isOpen, instructorId]);

    useEffect(() => {
        if (!isOpen) return;

        const cohortIds = Array.from(
            new Set(
                (detail?.cohort_assignments ?? [])
                    .map((assignment) => assignment.cohort_id)
                    .filter((cohortId): cohortId is number => typeof cohortId === 'number')
            )
        );

        if (cohortIds.length === 0) {
            setSubjectOptionIndex(new Map());
            return;
        }

        let cancelled = false;

        Promise.all(
            cohortIds.map(async (cohortId) => ({
                cohortId,
                options: await cohortAPI.getSubjectOptions(cohortId),
            }))
        )
            .then((results) => {
                if (cancelled) return;

                const nextIndex: SourceAwareSubjectOptionIndex = new Map();

                results.forEach(({ cohortId, options }) => {
                    options.forEach((option) => {
                        const normalizedOption = normalizeSubjectOptionLookupEntry(cohortId, option);
                        if (typeof normalizedOption.cohort_subject_id !== 'number') return;

                        nextIndex.set(
                            buildSubjectOptionLookupKey(
                                cohortId,
                                normalizedOption.cohort_subject_id,
                                normalizedOption.source,
                            ),
                            normalizedOption
                        );

                        const genericKey = buildSubjectOptionLookupKey(
                            cohortId,
                            normalizedOption.cohort_subject_id,
                        );
                        if (!nextIndex.has(genericKey)) {
                            nextIndex.set(genericKey, normalizedOption);
                        }
                    });
                });

                setSubjectOptionIndex(nextIndex);
            })
            .catch(() => {
                if (!cancelled) {
                    setSubjectOptionIndex(new Map());
                }
            });

        return () => {
            cancelled = true;
        };
    }, [detail?.cohort_assignments, isOpen]);

    const normalizedCohortSubjects = allCohortSubjects.map((cohortSubject) =>
        normalizeAssignableCohortSubject(cohortSubject, subjectOptionIndex)
    );
    const activeTeachingAssignments = getActiveTeachingAssignments(detail, subjectOptionIndex);
    const assignedTeachingKeys = new Set(
        activeTeachingAssignments.map((assignment) => assignment.assignmentKey)
    );
    const availableCohortSubjects = normalizedCohortSubjects.filter(
        (cohortSubject) =>
            !cohortSubject.assigned &&
            !assignedTeachingKeys.has(getSourceAwareSubjectKey(cohortSubject)) &&
            typeof getSourceAwareSubjectId(cohortSubject) === 'number'
    );
    const selectedCohortSubjectOption = availableCohortSubjects.find(
        (cohortSubject) => getSourceAwareSubjectKey(cohortSubject) === selectedCohortSubject
    );

    const handleAssign = async () => {
        if (!selectedCohortSubjectOption) return;
        setWorking(true); setError(null);
        try {
            await instructorsAPI.assignToCohortSubject(instructorId, selectedCohortSubjectOption);
            setSelectedCohortSubject('');
            await refetch();
            await onAssignmentsChanged?.();
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to assign cohort subject'));
        } finally { setWorking(false); }
    };

    const handleUnassign = async (assignment: ActiveTeachingAssignment) => {
        setWorking(true); setError(null);
        try {
            await instructorsAPI.unassignFromCohortSubject(
                instructorId, assignment, unassignReason, unassignNotes
            );
            await refetch();
            await onAssignmentsChanged?.();
            setUnassignReason('MANUAL');
            setUnassignNotes('');
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to unassign cohort subject'));
        } finally { setWorking(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Teaching Assignments — ${instructorName}`} size="md">
            <div className="min-w-0 space-y-5">
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        Current Teaching Assignments ({activeTeachingAssignments.length})
                    </p>
                    {loading ? (
                        <div className="h-12 flex items-center justify-center">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        </div>
                    ) : activeTeachingAssignments.length === 0 ? (
                        <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            No active cohort-subject teaching assignments
                        </p>
                    ) : (
                        <div className="min-w-0 space-y-2">
                            {activeTeachingAssignments.map((assignment) => (
                                <div key={assignment.assignmentKey} className="rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="flex min-w-0 items-start justify-between gap-3 bg-gray-50 p-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="break-words text-sm font-medium text-gray-900">
                                                {assignment.cohortName}
                                            </p>
                                            <p className="mt-0.5 break-words text-sm text-gray-700">
                                                {assignment.subjectName}
                                            </p>
                                            <p className="mt-0.5 break-words text-xs text-gray-500">
                                                {assignment.curriculumName} · {assignment.academicYear}
                                                {assignment.assignedAt && (
                                                    <span className="ml-1 text-teal-600">
                                                        · since {new Date(assignment.assignedAt).toLocaleDateString('en-GB', {
                                                            day: '2-digit', month: 'short',
                                                        })}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleUnassign(assignment)}
                                            disabled={
                                                working ||
                                                !assignment.source?.trim() ||
                                                typeof getSourceAwareSubjectId(assignment) !== 'number'
                                            }
                                            className="shrink-0 self-start rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                            title="Unassign cohort subject"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="min-w-0 border-t border-gray-100 pt-4">
                    <div className="mb-3 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Unassign reason</label>
                            <select
                                value={unassignReason}
                                onChange={e => setUnassignReason(e.target.value)}
                                className="block w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="MANUAL">Manual</option>
                                <option value="REASSIGNED">Reassigned</option>
                                <option value="TERM_END">Term End</option>
                                <option value="MEMBERSHIP_REVOKED">Membership Revoked</option>
                                <option value="ACCOUNT_DELETED">Account Deleted</option>
                            </select>
                        </div>
                        <div className="min-w-0">
                            <Input
                                label="Unassign notes"
                                value={unassignNotes}
                                onChange={e => setUnassignNotes(e.target.value)}
                                placeholder="Optional notes"
                                className="min-w-0"
                            />
                        </div>
                    </div>

                    <p className="text-sm font-semibold text-gray-700 mb-2">Assign to Cohort Subject</p>
                    {availableCohortSubjects.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">
                            {allCohortSubjects.length === 0
                                ? 'No cohort subjects available'
                                : 'All cohort subjects are already assigned to this teacher'}
                        </p>
                    ) : (
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                            <div className="min-w-0 flex-1">
                                <CohortSubjectDropdown
                                    options={availableCohortSubjects}
                                    value={selectedCohortSubject}
                                    onChange={setSelectedCohortSubject}
                                    disabled={working}
                                />
                            </div>
                            <Button
                                variant="primary"
                                onClick={handleAssign}
                                disabled={!selectedCohortSubjectOption || working}
                                className="w-full shrink-0 sm:w-auto"
                            >
                                <Plus className="h-4 w-4" /> Assign Subject
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
}

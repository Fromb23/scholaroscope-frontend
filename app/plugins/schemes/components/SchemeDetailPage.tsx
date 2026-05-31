'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Download, Save } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { useSchemeDetail } from '@/app/core/hooks/useSchemes';
import type {
    SchemeEntry,
    SchemeEntryUpdatePayload,
    SchemeWeek,
    SchemeWeekType,
} from '@/app/core/types/schemes';
import {
    formatTimestamp,
    getSchemeWeekTypeLabel,
} from '@/app/plugins/schemes/lib/workflow';
import { TextAreaField } from '@/app/plugins/schemes/components/TextAreaField';

const REFLECTION_NOTICE =
    'Reflections are auto-filled from lesson reflections recorded after taught outcomes or learner performance evidence. You can review them here.';

function getSchemeId(rawId: string | string[] | undefined): number | null {
    const resolved = Array.isArray(rawId) ? rawId[0] : rawId;
    const numericId = Number(resolved);

    return Number.isFinite(numericId) ? numericId : null;
}

const WEEK_TYPE_OPTIONS: { value: SchemeWeekType; label: string }[] = [
    { value: 'TEACHING', label: 'Teaching' },
    { value: 'MIDTERM_BREAK', label: 'Midterm Break' },
    { value: 'MIDTERM_EXAM', label: 'Midterm Exams' },
    { value: 'ENTRY_EXAM', label: 'Entry Exams' },
    { value: 'EXIT_EXAM', label: 'End Term Exams' },
    { value: 'HOLIDAY', label: 'Holiday' },
    { value: 'OTHER', label: 'Other' },
];

interface EntryDraftState {
    learning_experiences: string;
    key_inquiry_questions: string;
    learning_resources: string;
    assessment_methods: string;
    reflection: string;
}

interface WeekDraftState {
    week_type: SchemeWeekType;
    label: string;
    notes: string;
    affects_learning: boolean;
}

function buildEntryDraft(entry: SchemeEntry): EntryDraftState {
    return {
        learning_experiences: entry.learning_experiences,
        key_inquiry_questions: entry.key_inquiry_questions,
        learning_resources: entry.learning_resources,
        assessment_methods: entry.assessment_methods,
        reflection: entry.reflection,
    };
}

function buildWeekDraft(week: SchemeWeek): WeekDraftState {
    return {
        week_type: week.week_type,
        label: week.label,
        notes: week.notes,
        affects_learning: week.affects_learning,
    };
}

function getEntryPatch(entry: SchemeEntry, draft: EntryDraftState): SchemeEntryUpdatePayload {
    const payload: SchemeEntryUpdatePayload = {};

    if (entry.learning_experiences !== draft.learning_experiences) {
        payload.learning_experiences = draft.learning_experiences;
    }
    if (entry.key_inquiry_questions !== draft.key_inquiry_questions) {
        payload.key_inquiry_questions = draft.key_inquiry_questions;
    }
    if (entry.learning_resources !== draft.learning_resources) {
        payload.learning_resources = draft.learning_resources;
    }
    if (entry.assessment_methods !== draft.assessment_methods) {
        payload.assessment_methods = draft.assessment_methods;
    }
    if (entry.reflection !== draft.reflection) {
        payload.reflection = draft.reflection;
    }

    return payload;
}

export function SchemeDetailPage() {
    const params = useParams();
    const schemeId = getSchemeId(params.id);
    const {
        scheme,
        weeks,
        loading,
        error,
        refetch,
        updateScheme,
        updateWeek,
        updateEntry,
        downloadScheme,
    } = useSchemeDetail(schemeId);

    const [titleDraft, setTitleDraft] = useState('');
    const [savingTitle, setSavingTitle] = useState(false);
    const [savingWeekId, setSavingWeekId] = useState<number | null>(null);
    const [savingEntryId, setSavingEntryId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [entryDrafts, setEntryDrafts] = useState<Record<number, EntryDraftState>>({});
    const [weekDrafts, setWeekDrafts] = useState<Record<number, WeekDraftState>>({});
    const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (!scheme) {
            return;
        }
        setTitleDraft(scheme.title);
    }, [scheme]);

    useEffect(() => {
        if (weeks.length === 0) {
            return;
        }

        setExpandedWeeks((current) => {
            if (Object.keys(current).length > 0) {
                return current;
            }
            return {
                [weeks[0].id]: true,
            };
        });
    }, [weeks]);

    const entries = useMemo(() => scheme?.entries ?? [], [scheme?.entries]);
    const entriesByWeek = useMemo(() => {
        const map = new Map<number, SchemeEntry[]>();
        entries.forEach((entry) => {
            const list = map.get(entry.week) ?? [];
            list.push(entry);
            map.set(entry.week, list);
        });
        return map;
    }, [entries]);

    const readOnly = scheme?.is_historical ?? false;

    const isTitleDirty = Boolean(scheme && titleDraft.trim() !== scheme.title.trim());

    const handleSaveTitle = async () => {
        if (!scheme || !isTitleDirty) {
            return;
        }

        try {
            setActionError(null);
            setSavingTitle(true);
            await updateScheme({ title: titleDraft.trim() });
            setActionSuccess('Scheme title saved.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not save the scheme title.');
        } finally {
            setSavingTitle(false);
        }
    };

    const handleSaveWeek = async (week: SchemeWeek) => {
        const draft = weekDrafts[week.id] ?? buildWeekDraft(week);
        const isDirty = (
            week.week_type !== draft.week_type
            || week.label !== draft.label
            || week.notes !== draft.notes
            || week.affects_learning !== draft.affects_learning
        );

        if (!isDirty) {
            return;
        }

        try {
            setActionError(null);
            setSavingWeekId(week.id);
            await updateWeek(week.id, draft);
            setWeekDrafts((current) => {
                const next = { ...current };
                delete next[week.id];
                return next;
            });
            await refetch();
            setActionSuccess(`Week ${week.week_number} saved.`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not save the learning week.');
        } finally {
            setSavingWeekId(null);
        }
    };

    const handleSaveEntry = async (entry: SchemeEntry) => {
        const draft = entryDrafts[entry.id] ?? buildEntryDraft(entry);
        const payload = getEntryPatch(entry, draft);

        if (Object.keys(payload).length === 0) {
            return;
        }

        try {
            setActionError(null);
            setSavingEntryId(entry.id);
            await updateEntry(entry.id, payload);
            setEntryDrafts((current) => {
                const next = { ...current };
                delete next[entry.id];
                return next;
            });
            setActionSuccess(`Week ${entry.week_number} lesson ${entry.lesson} saved.`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not save the scheme row.');
        } finally {
            setSavingEntryId(null);
        }
    };

    const handleDownload = async () => {
        try {
            setActionError(null);
            await downloadScheme();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not download the scheme of work.');
        }
    };

    if (!schemeId) {
        return <ErrorState message="This scheme of work could not be found." fullScreen={false} />;
    }

    if (loading) {
        return <LoadingSpinner message="Loading scheme of work..." fullScreen={false} />;
    }

    if (error || !scheme) {
        return <ErrorState message={error ?? 'This scheme of work could not be found.'} fullScreen={false} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <Link href="/schemes">
                    <Button type="button" variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Schemes
                    </Button>
                </Link>
                <Button type="button" variant="secondary" onClick={() => void handleDownload()}>
                    <Download className="h-4 w-4" />
                    Download Scheme
                </Button>
            </div>

            {actionError ? (
                <ErrorBanner
                    title="Scheme update"
                    message={actionError}
                    onDismiss={() => setActionError(null)}
                />
            ) : null}

            {actionSuccess ? (
                <ErrorBanner
                    title="Saved"
                    message={actionSuccess}
                    variant="success"
                    autoDismissMs={3000}
                    onDismiss={() => setActionSuccess(null)}
                />
            ) : null}

            <Card className="space-y-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold theme-text">{scheme.subject_name}</h1>
                            <Badge variant={scheme.is_historical ? 'warning' : 'success'}>
                                {scheme.status_display}
                            </Badge>
                            {scheme.is_historical ? (
                                <Badge variant="warning">Historical record</Badge>
                            ) : null}
                        </div>
                        <p className="text-sm theme-subtle">
                            {scheme.curriculum_name} • {scheme.level_label} • {scheme.term_name}
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Teacher</p>
                            <p className="mt-1 text-sm theme-text">{scheme.teacher_name}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Learning Weeks</p>
                            <p className="mt-1 text-sm theme-text">{scheme.active_learning_week_count}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Last updated</p>
                            <p className="mt-1 text-sm theme-text">{formatTimestamp(scheme.updated_at)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <Input
                        label="Scheme title"
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        disabled={readOnly}
                    />
                    <div className="flex items-end">
                        <Button
                            type="button"
                            onClick={() => void handleSaveTitle()}
                            disabled={!isTitleDirty || savingTitle || readOnly}
                        >
                            <Save className="h-4 w-4" />
                            {savingTitle ? 'Saving...' : 'Save Title'}
                        </Button>
                    </div>
                </div>

                {readOnly ? (
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm text-yellow-900">
                        {scheme.read_only_reason || 'This scheme is now a historical record for the completed term.'}
                    </div>
                ) : null}

                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                    {REFLECTION_NOTICE}
                </div>
            </Card>

            <Card className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold theme-text">Learning Weeks</h2>
                    <p className="mt-1 text-sm theme-subtle">
                        Update week labels, notes, and exceptional week details here.
                    </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    {weeks.map((week) => {
                        const draft = weekDrafts[week.id] ?? buildWeekDraft(week);
                        const isDirty = (
                            week.week_type !== draft.week_type
                            || week.label !== draft.label
                            || week.notes !== draft.notes
                            || week.affects_learning !== draft.affects_learning
                        );

                        return (
                            <div key={week.id} className="rounded-xl border theme-border p-4">
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-semibold theme-text">
                                            Week {week.week_number}
                                        </h3>
                                        <p className="mt-1 text-sm theme-subtle">
                                            {week.week_type_display}
                                        </p>
                                    </div>
                                    {isDirty ? (
                                        <Badge variant="warning">Unsaved changes</Badge>
                                    ) : (
                                        <Badge variant="success">Saved</Badge>
                                    )}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <Select
                                        label="Week type"
                                        value={draft.week_type}
                                        onChange={(event) => setWeekDrafts((current) => ({
                                            ...current,
                                            [week.id]: {
                                                ...draft,
                                                week_type: event.target.value as SchemeWeekType,
                                            },
                                        }))}
                                        disabled={readOnly}
                                        options={WEEK_TYPE_OPTIONS}
                                    />
                                    <Select
                                        label="Affects learning"
                                        value={String(draft.affects_learning)}
                                        onChange={(event) => setWeekDrafts((current) => ({
                                            ...current,
                                            [week.id]: {
                                                ...draft,
                                                affects_learning: event.target.value === 'true',
                                            },
                                        }))}
                                        disabled={readOnly}
                                        options={[
                                            { value: 'false', label: 'No, keep learning week' },
                                            { value: 'true', label: 'Yes, reduce learning week' },
                                        ]}
                                    />
                                </div>

                                <div className="mt-4 grid gap-4">
                                    <Input
                                        label="Label"
                                        value={draft.label}
                                        onChange={(event) => setWeekDrafts((current) => ({
                                            ...current,
                                            [week.id]: {
                                                ...draft,
                                                label: event.target.value,
                                            },
                                        }))}
                                        disabled={readOnly}
                                    />
                                    <TextAreaField
                                        label="Week notes"
                                        value={draft.notes}
                                        onChange={(event) => setWeekDrafts((current) => ({
                                            ...current,
                                            [week.id]: {
                                                ...draft,
                                                notes: event.target.value,
                                            },
                                        }))}
                                        disabled={readOnly}
                                        rows={3}
                                    />
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => void handleSaveWeek(week)}
                                        disabled={!isDirty || savingWeekId === week.id || readOnly}
                                    >
                                        <Save className="h-4 w-4" />
                                        {savingWeekId === week.id ? 'Saving...' : 'Save Week'}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Card className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold theme-text">Scheme Table</h2>
                    <p className="mt-1 text-sm theme-subtle">
                        Review the learning weeks and update the teacher-facing draft fields as needed.
                    </p>
                </div>

                <div className="hidden overflow-x-auto xl:block">
                    <table className="min-w-[1600px] divide-y divide-gray-200 rounded-lg border theme-border">
                        <thead className="theme-surface-muted">
                            <tr>
                                {[
                                    'Week',
                                    'Lesson',
                                    'Strand',
                                    'Sub-strand',
                                    'Lesson Learning Outcomes',
                                    'Learning Experiences',
                                    'Key Inquiry Question(s)',
                                    'Learning Resources',
                                    'Assessment Methods',
                                    'Reflection',
                                    'Save',
                                ].map((column) => (
                                    <th
                                        key={column}
                                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 theme-surface">
                            {entries.map((entry) => {
                                const draft = entryDrafts[entry.id] ?? buildEntryDraft(entry);
                                const isDirty = Object.keys(getEntryPatch(entry, draft)).length > 0;

                                return (
                                    <tr key={entry.id}>
                                        <td className="px-4 py-4 text-sm theme-text">
                                            Week {entry.week_number}
                                        </td>
                                        <td className="px-4 py-4 text-sm theme-text">{entry.lesson}</td>
                                        <td className="max-w-[180px] px-4 py-4 text-sm theme-text">{entry.strand || '-'}</td>
                                        <td className="max-w-[180px] px-4 py-4 text-sm theme-text">{entry.sub_strand || '-'}</td>
                                        <td className="max-w-[220px] px-4 py-4 text-sm theme-text">
                                            {entry.lesson_learning_outcomes || '-'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <textarea
                                                className="theme-input min-h-[120px] w-[220px] rounded-lg px-3 py-2 text-sm"
                                                value={draft.learning_experiences}
                                                onChange={(event) => setEntryDrafts((current) => ({
                                                    ...current,
                                                    [entry.id]: {
                                                        ...draft,
                                                        learning_experiences: event.target.value,
                                                    },
                                                }))}
                                                disabled={readOnly}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <textarea
                                                className="theme-input min-h-[120px] w-[220px] rounded-lg px-3 py-2 text-sm"
                                                value={draft.key_inquiry_questions}
                                                onChange={(event) => setEntryDrafts((current) => ({
                                                    ...current,
                                                    [entry.id]: {
                                                        ...draft,
                                                        key_inquiry_questions: event.target.value,
                                                    },
                                                }))}
                                                disabled={readOnly}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <textarea
                                                className="theme-input min-h-[120px] w-[220px] rounded-lg px-3 py-2 text-sm"
                                                value={draft.learning_resources}
                                                onChange={(event) => setEntryDrafts((current) => ({
                                                    ...current,
                                                    [entry.id]: {
                                                        ...draft,
                                                        learning_resources: event.target.value,
                                                    },
                                                }))}
                                                disabled={readOnly}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <textarea
                                                className="theme-input min-h-[120px] w-[220px] rounded-lg px-3 py-2 text-sm"
                                                value={draft.assessment_methods}
                                                onChange={(event) => setEntryDrafts((current) => ({
                                                    ...current,
                                                    [entry.id]: {
                                                        ...draft,
                                                        assessment_methods: event.target.value,
                                                    },
                                                }))}
                                                disabled={readOnly}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <textarea
                                                className="theme-input min-h-[120px] w-[220px] rounded-lg px-3 py-2 text-sm"
                                                value={draft.reflection}
                                                onChange={(event) => setEntryDrafts((current) => ({
                                                    ...current,
                                                    [entry.id]: {
                                                        ...draft,
                                                        reflection: event.target.value,
                                                    },
                                                }))}
                                                disabled={readOnly}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col items-start gap-2">
                                                {isDirty ? (
                                                    <Badge variant="warning">Unsaved</Badge>
                                                ) : (
                                                    <Badge variant="success">Saved</Badge>
                                                )}
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => void handleSaveEntry(entry)}
                                                    disabled={!isDirty || savingEntryId === entry.id || readOnly}
                                                >
                                                    <Save className="h-4 w-4" />
                                                    {savingEntryId === entry.id ? 'Saving...' : 'Save'}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="space-y-4 xl:hidden">
                    {weeks.map((week) => {
                        const weekEntries = entriesByWeek.get(week.id) ?? [];
                        const expanded = expandedWeeks[week.id] ?? false;

                        return (
                            <div key={week.id} className="rounded-xl border theme-border">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                                    onClick={() => setExpandedWeeks((current) => ({
                                        ...current,
                                        [week.id]: !expanded,
                                    }))}
                                >
                                    <div>
                                        <p className="text-base font-semibold theme-text">
                                            Week {week.week_number}
                                        </p>
                                        <p className="mt-1 text-sm theme-subtle">
                                            {week.label || getSchemeWeekTypeLabel(week.week_type)}
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
                                        {weekEntries.map((entry) => {
                                            const draft = entryDrafts[entry.id] ?? buildEntryDraft(entry);
                                            const isDirty = Object.keys(getEntryPatch(entry, draft)).length > 0;

                                            return (
                                                <div key={entry.id} className="space-y-4 rounded-xl bg-gray-50 p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold theme-text">
                                                                Week {entry.week_number} • Lesson {entry.lesson}
                                                            </p>
                                                            <p className="mt-1 text-sm theme-subtle">
                                                                {entry.strand || '-'} • {entry.sub_strand || '-'}
                                                            </p>
                                                        </div>
                                                        {isDirty ? (
                                                            <Badge variant="warning">Unsaved</Badge>
                                                        ) : (
                                                            <Badge variant="success">Saved</Badge>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                            Lesson Learning Outcomes
                                                        </p>
                                                        <p className="mt-1 text-sm theme-text">
                                                            {entry.lesson_learning_outcomes || '-'}
                                                        </p>
                                                    </div>

                                                    <TextAreaField
                                                        label="Learning Experiences"
                                                        value={draft.learning_experiences}
                                                        onChange={(event) => setEntryDrafts((current) => ({
                                                            ...current,
                                                            [entry.id]: {
                                                                ...draft,
                                                                learning_experiences: event.target.value,
                                                            },
                                                        }))}
                                                        disabled={readOnly}
                                                    />

                                                    <TextAreaField
                                                        label="Key Inquiry Question(s)"
                                                        value={draft.key_inquiry_questions}
                                                        onChange={(event) => setEntryDrafts((current) => ({
                                                            ...current,
                                                            [entry.id]: {
                                                                ...draft,
                                                                key_inquiry_questions: event.target.value,
                                                            },
                                                        }))}
                                                        disabled={readOnly}
                                                    />

                                                    <TextAreaField
                                                        label="Learning Resources"
                                                        value={draft.learning_resources}
                                                        onChange={(event) => setEntryDrafts((current) => ({
                                                            ...current,
                                                            [entry.id]: {
                                                                ...draft,
                                                                learning_resources: event.target.value,
                                                            },
                                                        }))}
                                                        disabled={readOnly}
                                                    />

                                                    <TextAreaField
                                                        label="Assessment Methods"
                                                        value={draft.assessment_methods}
                                                        onChange={(event) => setEntryDrafts((current) => ({
                                                            ...current,
                                                            [entry.id]: {
                                                                ...draft,
                                                                assessment_methods: event.target.value,
                                                            },
                                                        }))}
                                                        disabled={readOnly}
                                                    />

                                                    <TextAreaField
                                                        label="Reflection"
                                                        helpText={REFLECTION_NOTICE}
                                                        value={draft.reflection}
                                                        onChange={(event) => setEntryDrafts((current) => ({
                                                            ...current,
                                                            [entry.id]: {
                                                                ...draft,
                                                                reflection: event.target.value,
                                                            },
                                                        }))}
                                                        disabled={readOnly}
                                                    />

                                                    <div className="flex justify-end">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => void handleSaveEntry(entry)}
                                                            disabled={!isDirty || savingEntryId === entry.id || readOnly}
                                                        >
                                                            <Save className="h-4 w-4" />
                                                            {savingEntryId === entry.id ? 'Saving...' : 'Save'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}

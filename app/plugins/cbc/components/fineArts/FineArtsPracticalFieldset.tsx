'use client';

import { useEffect, useMemo } from 'react';
import { Palette } from 'lucide-react';

import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useFineArtsCourseworkTasks } from '@/app/plugins/cbc/hooks/useFineArtsPracticals';

interface FineArtsPracticalFieldsetProps {
    title: string;
    description: string;
    selectedTaskId?: number | null;
    termNumber?: number;
    disabled?: boolean;
    error?: string;
    onTaskChange: (taskId: number | null, taskCode?: string) => void;
}

function formatExhibitionLabel(exhibitionType: 'MINI_EXHIBITION' | 'END_YEAR_EXHIBITION') {
    return exhibitionType === 'END_YEAR_EXHIBITION'
        ? 'End Year Exhibition'
        : 'Mini Exhibition';
}

export function FineArtsPracticalFieldset({
    title,
    description,
    selectedTaskId,
    termNumber,
    disabled = false,
    error,
    onTaskChange,
}: FineArtsPracticalFieldsetProps) {
    const tasksQuery = useFineArtsCourseworkTasks(termNumber);
    const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
    const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

    useEffect(() => {
        if (!selectedTaskId || tasksQuery.isLoading) {
            return;
        }

        if (!selectedTask && tasks.length > 0) {
            onTaskChange(null);
        }
    }, [onTaskChange, selectedTask, selectedTaskId, tasks, tasksQuery.isLoading]);

    const formatRequiredEvidenceLabel = (value: string) => (
        value
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (character) => character.toUpperCase())
    );

    return (
        <Card>
            <div className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                    <div className="theme-surface-elevated rounded-lg border p-2 theme-border theme-text">
                        <Palette className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold theme-text">{title}</h2>
                        <p className="text-sm theme-muted">{description}</p>
                        {typeof termNumber === 'number' ? (
                            <p className="text-xs theme-subtle">Showing official Term {termNumber} coursework tasks.</p>
                        ) : null}
                    </div>
                </div>

                {tasksQuery.isLoading ? (
                    <LoadingSpinner message="Loading Fine Arts coursework tasks..." fullScreen={false} />
                ) : null}

                {tasksQuery.error ? (
                    <div className="rounded-lg border px-3 py-2 text-sm theme-border theme-muted">
                        We could not load the official Fine Arts coursework tasks.
                    </div>
                ) : null}

                <Select
                    label="Fine Arts coursework task"
                    value={selectedTaskId ? String(selectedTaskId) : ''}
                    onChange={(event) => {
                        const value = event.target.value;
                        const task = tasks.find((entry) => entry.id === Number(value)) ?? null;
                        onTaskChange(task?.id ?? null, task?.task_code);
                    }}
                    disabled={disabled || tasksQuery.isLoading || tasks.length === 0}
                    error={error}
                    options={[
                        {
                            value: '',
                            label: tasks.length > 0
                                ? 'Select the official Fine Arts task'
                                : 'No Fine Arts coursework tasks available',
                        },
                        ...tasks.map((task) => ({
                            value: task.id,
                            label: `${task.task_code} · ${task.name} (Term ${task.term_number})`,
                        })),
                    ]}
                />

                {selectedTask ? (
                    <div className="space-y-4 rounded-xl border p-4 theme-border theme-surface-muted">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="theme-surface-elevated rounded-full border px-2.5 py-1 text-xs font-semibold theme-border theme-text">
                                {selectedTask.task_code}
                            </span>
                            <span className="theme-surface-elevated rounded-full border px-2.5 py-1 text-xs font-medium theme-border theme-muted">
                                {formatExhibitionLabel(selectedTask.exhibition_type)}
                            </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Theme</p>
                                <p className="mt-1 text-sm font-medium theme-text">{selectedTask.annual_theme}</p>
                                <p className="text-sm theme-muted">{selectedTask.term_sub_theme}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Task focus</p>
                                <p className="mt-1 text-sm font-medium theme-text">{selectedTask.strand}</p>
                                <p className="text-sm theme-muted">{selectedTask.sub_strand}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Marks breakdown</p>
                            <div className="mt-2 space-y-2">
                                {selectedTask.assessment_criteria.map((criterion) => (
                                    <div
                                        key={criterion.key}
                                        className="theme-surface-elevated flex items-center justify-between rounded-lg border px-3 py-2 text-sm theme-border"
                                    >
                                        <span className="theme-text">{criterion.label}</span>
                                        <span className="font-semibold theme-text">{criterion.max_marks} marks</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Required evidence</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedTask.required_evidence.map((item) => (
                                    <span
                                        key={item}
                                        className="theme-surface-elevated rounded-full border px-2.5 py-1 text-xs font-medium theme-border theme-muted"
                                    >
                                        {formatRequiredEvidenceLabel(item)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </Card>
    );
}

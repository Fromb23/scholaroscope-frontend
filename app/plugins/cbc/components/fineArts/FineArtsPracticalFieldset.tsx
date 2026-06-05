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
                    <div className="rounded-lg bg-orange-50 p-2 text-orange-700">
                        <Palette className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                        <p className="text-sm text-gray-600">{description}</p>
                        {typeof termNumber === 'number' ? (
                            <p className="text-xs text-gray-500">Showing official Term {termNumber} coursework tasks.</p>
                        ) : null}
                    </div>
                </div>

                {tasksQuery.isLoading ? (
                    <LoadingSpinner message="Loading Fine Arts coursework tasks..." fullScreen={false} />
                ) : null}

                {tasksQuery.error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
                    <div className="space-y-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-orange-700">
                                {selectedTask.task_code}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                                {formatExhibitionLabel(selectedTask.exhibition_type)}
                            </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Theme</p>
                                <p className="mt-1 text-sm font-medium text-gray-900">{selectedTask.annual_theme}</p>
                                <p className="text-sm text-gray-700">{selectedTask.term_sub_theme}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Task focus</p>
                                <p className="mt-1 text-sm font-medium text-gray-900">{selectedTask.strand}</p>
                                <p className="text-sm text-gray-700">{selectedTask.sub_strand}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Marks breakdown</p>
                            <div className="mt-2 space-y-2">
                                {selectedTask.assessment_criteria.map((criterion) => (
                                    <div
                                        key={criterion.key}
                                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                                    >
                                        <span className="text-gray-800">{criterion.label}</span>
                                        <span className="font-semibold text-gray-900">{criterion.max_marks} marks</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Required evidence</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedTask.required_evidence.map((item) => (
                                    <span
                                        key={item}
                                        className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700"
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

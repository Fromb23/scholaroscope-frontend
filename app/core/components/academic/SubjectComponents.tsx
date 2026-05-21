'use client';

// ============================================================================
// app/core/components/academic/SubjectComponents.tsx
//
// Components and utilities for subjects page.
// No any. No alert(). No API calls.
// ============================================================================

import { useState, useEffect } from 'react';
import {
    BookOpen, Edit2, Trash2, ChevronDown, ChevronRight,
    Plus,
    ExternalLink,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import { getCurriculumOptionLabel } from '@/app/core/lib/curriculumBridge';
import type { Subject, SubjectFormData, Curriculum } from '@/app/core/types/academic';

// ── Grouping utility ──────────────────────────────────────────────────────

export interface CurriculumSubjectGroup {
    curriculumName: string;
    curriculumType: string;
    subjects: Map<string, Subject[]>;
}

export function groupSubjects(subjects: Subject[], search: string): CurriculumSubjectGroup[] {
    const q = search.toLowerCase().trim();

    const filtered = q
        ? subjects.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q) ||
            s.level.toLowerCase().includes(q) ||
            s.curriculum_name.toLowerCase().includes(q)
        )
        : subjects;

    const outer = new Map<string, CurriculumSubjectGroup>();

    filtered.forEach(s => {
        if (!outer.has(s.curriculum_name)) {
            outer.set(s.curriculum_name, {
                curriculumName: s.curriculum_name,
                curriculumType: s.curriculum_type,
                subjects: new Map(),
            });
        }
        const inner = outer.get(s.curriculum_name)!.subjects;
        if (!inner.has(s.name)) inner.set(s.name, []);
        inner.get(s.name)!.push(s);
    });

    // Sort levels within each subject group
    outer.forEach(({ subjects: inner }) => {
        inner.forEach(levels => levels.sort((a, b) => a.level.localeCompare(b.level)));
    });

    return Array.from(outer.values());
}

// ── SubjectNameGroup ──────────────────────────────────────────────────────

interface SubjectNameGroupProps {
    name: string;
    levels: Subject[];
    onEdit: (s: Subject) => void;
    onDelete: (id: number) => void;
    onAddLevel: (s: Subject) => void;
    onAssignToCohort: (s: Subject) => void;
    canManage: boolean;
}

export function SubjectNameGroup({
    name,
    levels,
    onEdit,
    onAddLevel,
    onDelete,
    onAssignToCohort,
    canManage,
}: SubjectNameGroupProps) {
    const [open, setOpen] = useState(true);

    return (
        <div className="overflow-hidden rounded-lg border theme-border">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="theme-surface theme-hover-surface flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
            >
                {open
                    ? <ChevronDown className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 theme-subtle shrink-0" />
                }
                <span className="flex-1 text-sm font-semibold theme-text">{name}</span>
                <Badge variant="default" size="sm">
                    {levels.length} level{levels.length !== 1 ? 's' : ''}
                </Badge>
                {canManage ? (
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onAddLevel(levels[0]); }}
                        className="rounded-md p-1 theme-subtle transition-colors theme-hover-success"
                        title="Add level"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                ) : null}
            </button>

            {open && (
                <div className="divide-y divide-gray-200 border-t theme-border">
                    {levels.map(subject => (
                        <div
                            key={subject.id}
                            className="theme-surface-muted theme-hover-surface flex flex-col gap-3 px-4 py-3 pl-9 transition-colors sm:flex-row sm:items-center"
                        >
                            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="w-24 shrink-0 font-mono text-xs font-medium theme-text">{subject.code}</span>
                                    <Badge variant="blue" size="sm" className="shrink-0">{subject.level}</Badge>
                                </div>
                                {subject.description && (
                                    <p className="truncate text-xs theme-muted">
                                        {subject.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
                                {canManage ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => onAssignToCohort(subject)}
                                        className="w-full sm:w-auto"
                                    >
                                        Assign to Cohort
                                    </Button>
                                ) : null}
                                <a
                                    href={`/academic/subjects/${subject.id}`}
                                    className="rounded-lg p-1.5 theme-subtle transition-colors theme-hover-info"
                                    title="View Subject"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                                {canManage ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => onEdit(subject)}
                                            className="rounded-lg p-1.5 theme-subtle transition-colors theme-hover-info"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(subject.id)}
                                            className="rounded-lg p-1.5 theme-subtle transition-colors theme-hover-danger"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── CurriculumGroup ───────────────────────────────────────────────────────

interface CurriculumGroupProps {
    curriculumName: string;
    curriculumType: string;
    subjectGroups: Map<string, Subject[]>;
    onEdit: (s: Subject) => void;
    onDelete: (id: number) => void;
    onAddLevel: (s: Subject) => void;
    onAssignToCohort: (s: Subject) => void;
    canManage: boolean;
}

export function CurriculumGroup({
    curriculumName, curriculumType, subjectGroups, onEdit, onDelete, onAddLevel, onAssignToCohort, canManage,
}: CurriculumGroupProps) {
    const [open, setOpen] = useState(true);
    const totalSubjects = Array.from(subjectGroups.values()).flat().length;

    return (
        <div className="overflow-hidden rounded-xl border theme-border">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="theme-surface-elevated theme-hover-surface flex w-full items-center gap-3 px-5 py-4 text-left transition-colors"
            >
                {open
                    ? <ChevronDown className="h-4 w-4 text-blue-600 shrink-0" />
                    : <ChevronRight className="h-4 w-4 theme-subtle shrink-0" />
                }
                <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />

                {/* mobile: code only, desktop: full name */}
                <span className="flex-1 truncate font-bold theme-text">
                    <span className="flex-1 min-w-0 truncate font-bold theme-text">
                        {curriculumName}
                    </span>
                </span>

                <Badge variant="blue" size="sm" className="shrink-0">{curriculumType}</Badge>
                <span className="ml-2 hidden text-xs theme-subtle sm:inline">
                    {subjectGroups.size} subject{subjectGroups.size !== 1 ? 's' : ''} · {totalSubjects} level{totalSubjects !== 1 ? 's' : ''}
                </span>
            </button>

            {open && (
                <div className="theme-surface space-y-2 border-t p-4 theme-border">
                    {Array.from(subjectGroups.entries()).map(([name, levels]) => (
                        <SubjectNameGroup
                            key={name}
                            name={name}
                            levels={levels}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAddLevel={onAddLevel}
                            onAssignToCohort={onAssignToCohort}
                            canManage={canManage}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── SubjectFormModal ──────────────────────────────────────────────────────

interface SubjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editing: Subject | null;
    curricula: Curriculum[];
    onSave: (data: SubjectFormData, editingId?: number) => Promise<void>;
    defaultCurriculumId: number;
    addingLevelTo: Subject | null;
}

export function SubjectFormModal({
    isOpen, onClose, editing, curricula, onSave, defaultCurriculumId, addingLevelTo,
}: SubjectFormModalProps) {
    const [form, setForm] = useState<SubjectFormData>(() => editing
        ? { curriculum: editing.curriculum, code: editing.code, name: editing.name, level: editing.level ?? '', description: editing.description }
        : { curriculum: defaultCurriculumId, code: '', name: '', level: '', description: '' }
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync form when editing changes
    useEffect(() => {
        if (addingLevelTo) {
            setForm({
                curriculum: addingLevelTo.curriculum,
                code: addingLevelTo.code,
                name: addingLevelTo.name,
                level: '',
                description: '',
            });
        } else if (editing) {
            setForm({
                curriculum: editing.curriculum,
                code: editing.code,
                name: editing.name,
                level: editing.level ?? '',
                description: editing.description,
            });
        } else {
            setForm({ curriculum: defaultCurriculumId, code: '', name: '', level: '', description: '' });
        }
        setError(null);
    }, [addingLevelTo, defaultCurriculumId, editing, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            await onSave(form, editing?.id);
            onClose();
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to save subject.'));
        } finally { setSaving(false); }
    };

    const handleClose = () => { setError(null); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={
            addingLevelTo
                ? `Add Level — ${addingLevelTo.name}`
                : editing
                    ? 'Edit Subject'
                    : 'Create Subject'
        }>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                <Select
                    label="Curriculum"
                    value={form.curriculum.toString()}
                    disabled={!!addingLevelTo || !!editing}
                    onChange={e => setForm(prev => ({ ...prev, curriculum: Number(e.target.value) }))}
                    required
                    options={[
                        { value: '', label: 'Select Curriculum' },
                        ...curricula.map(c => ({
                            value: String(c.id),
                            label: getCurriculumOptionLabel(c),
                        })),
                    ]}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Subject Code"
                        placeholder="e.g., COMP2025"
                        value={form.code}
                        disabled={!!addingLevelTo}
                        readOnly={!!addingLevelTo}
                        onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        required
                    />
                    <Input
                        label="Subject Name"
                        placeholder="e.g., Computer Studies"
                        value={form.name}
                        disabled={!!addingLevelTo}
                        readOnly={!!addingLevelTo}
                        onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                    />
                </div>

                <Input
                    label="Level"
                    placeholder="e.g., Form 3, Grade 10, all"
                    value={form.level}
                    onChange={e => setForm(prev => ({ ...prev, level: e.target.value }))}
                    required
                />

                <div>
                    <label className="mb-1 block text-sm font-medium theme-text">Description</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                        className="theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Optional subject description"
                    />
                </div>

                <div className="flex justify-end gap-3 border-t pt-4 theme-border">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving...' : addingLevelTo ? 'Add Level' : editing ? 'Update Subject' : 'Create Subject'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

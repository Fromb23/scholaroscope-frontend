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
}

export function SubjectNameGroup({ name, levels, onEdit, onAddLevel, onDelete }: SubjectNameGroupProps) {
    const [open, setOpen] = useState(true);

    return (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
            >
                {open
                    ? <ChevronDown className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                }
                <span className="font-semibold text-gray-800 flex-1 text-sm">{name}</span>
                <Badge variant="default" size="sm">
                    {levels.length} level{levels.length !== 1 ? 's' : ''}
                </Badge>
                <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onAddLevel(levels[0]); }}
                    className="p-1 rounded-md text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                    title="Add level"
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </button>

            {open && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {levels.map(subject => (
                        <div
                            key={subject.id}
                            className="flex items-center gap-4 px-4 py-2.5 pl-9 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <span className="font-mono text-xs text-gray-400 w-24 shrink-0">{subject.code}</span>
                            <Badge variant="blue" size="sm" className="shrink-0">{subject.level}</Badge>
                            {subject.description && (
                                <p className="text-xs text-gray-400 flex-1 truncate hidden md:block">
                                    {subject.description}
                                </p>
                            )}
                            <div className="flex items-center gap-1 ml-auto shrink-0">
                                <a
                                    href={`/academic/subjects/${subject.id}`}
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                    title="View Subject"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                                <button
                                    onClick={() => onEdit(subject)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => onDelete(subject.id)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
}

export function CurriculumGroup({
    curriculumName, curriculumType, subjectGroups, onEdit, onDelete, onAddLevel,
}: CurriculumGroupProps) {
    const [open, setOpen] = useState(true);
    const totalSubjects = Array.from(subjectGroups.values()).flat().length;

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 hover:to-gray-50 transition-all text-left"
            >
                {open
                    ? <ChevronDown className="h-4 w-4 text-blue-600 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                }
                <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />

                {/* mobile: code only, desktop: full name */}
                <span className="font-bold text-gray-900 flex-1 truncate">
                    <span className="font-bold text-gray-900 flex-1 min-w-0 truncate">
                        {curriculumName}
                    </span>
                </span>

                <Badge variant="blue" size="sm" className="shrink-0">{curriculumType}</Badge>
                <span className="text-xs text-gray-400 ml-2 hidden sm:inline">
                    {subjectGroups.size} subject{subjectGroups.size !== 1 ? 's' : ''} · {totalSubjects} level{totalSubjects !== 1 ? 's' : ''}
                </span>
            </button>

            {open && (
                <div className="border-t border-gray-100 p-4 space-y-2 bg-white">
                    {Array.from(subjectGroups.entries()).map(([name, levels]) => (
                        <SubjectNameGroup
                            key={name}
                            name={name}
                            levels={levels}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAddLevel={onAddLevel}
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
    }, [editing, isOpen, addingLevelTo]);

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
                            label: `${c.name} (${c.curriculum_type_display})`,
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={3}
                        placeholder="Optional subject description"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
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
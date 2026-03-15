'use client';

import { useState, useMemo } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { useSubjects, useCurricula } from '@/app/core/hooks/useAcademic';
import { Subject, SubjectFormData } from '@/app/core/types/academic';

// ── Subject name group (innermost) ────────────────────────────────────────

function SubjectNameGroup({
    name, levels, onEdit, onDelete,
}: {
    name: string;
    levels: Subject[];
    onEdit: (s: Subject) => void;
    onDelete: (id: number) => void;
}) {
    const [open, setOpen] = useState(true);

    return (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
            {/* Subject name header */}
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
            </button>

            {/* Level rows */}
            {open && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {levels.map(subject => (
                        <div key={subject.id}
                            className="flex items-center gap-4 px-4 py-2.5 pl-9 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <span className="font-mono text-xs text-gray-400 w-24 shrink-0">{subject.code}</span>
                            <Badge variant="blue" size="sm" className="shrink-0">{subject.level}</Badge>
                            {subject.description && (
                                <p className="text-xs text-gray-400 flex-1 truncate hidden md:block">{subject.description}</p>
                            )}
                            <div className="flex items-center gap-1 ml-auto shrink-0">
                                <button onClick={() => onEdit(subject)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                    <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => onDelete(subject.id)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
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

// ── Curriculum group (outermost) ──────────────────────────────────────────

function CurriculumGroup({
    curriculumName, curriculumType, subjectGroups, onEdit, onDelete,
}: {
    curriculumName: string;
    curriculumType: string;
    subjectGroups: Map<string, Subject[]>;
    onEdit: (s: Subject) => void;
    onDelete: (id: number) => void;
}) {
    const [open, setOpen] = useState(true);
    const totalSubjects = Array.from(subjectGroups.values()).flat().length;

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Curriculum header */}
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
                <span className="font-bold text-gray-900 flex-1">{curriculumName}</span>
                <Badge variant="blue" size="sm" className="shrink-0">{curriculumType}</Badge>
                <span className="text-xs text-gray-400 ml-2">
                    {subjectGroups.size} subject{subjectGroups.size !== 1 ? 's' : ''} · {totalSubjects} level{totalSubjects !== 1 ? 's' : ''}
                </span>
            </button>

            {/* Subject groups inside */}
            {open && (
                <div className="border-t border-gray-100 p-4 space-y-2 bg-white">
                    {Array.from(subjectGroups.entries()).map(([name, levels]) => (
                        <SubjectNameGroup
                            key={name}
                            name={name}
                            levels={levels}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SubjectsPage() {
    const [search, setSearch] = useState('');
    const { subjects, loading, createSubject, updateSubject, deleteSubject } = useSubjects();
    const { curricula } = useCurricula();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [formData, setFormData] = useState<SubjectFormData>({
        curriculum: 0, code: '', name: '', level: '', description: '',
    });
    const [saving, setSaving] = useState(false);

    // Group: curriculum → subject name → levels[]
    const grouped = useMemo(() => {
        const filtered = subjects.filter(s => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
                s.name.toLowerCase().includes(q) ||
                s.code.toLowerCase().includes(q) ||
                s.level.toLowerCase().includes(q) ||
                s.curriculum_name.toLowerCase().includes(q)
            );
        });

        // curriculum_name → Map<subject_name, Subject[]>
        const outer = new Map<string, {
            curriculumName: string;
            curriculumType: string;
            subjects: Map<string, Subject[]>;
        }>();

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
    }, [subjects, search]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingSubject) {
                await updateSubject(editingSubject.id, formData);
            } else {
                await createSubject(formData);
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (subject: Subject) => {
        setEditingSubject(subject);
        setFormData({
            curriculum: subject.curriculum,
            code: subject.code,
            name: subject.name,
            level: subject.level ?? '',
            description: subject.description,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Delete this subject?')) {
            try { await deleteSubject(id); }
            catch (error: any) { alert(error.message); }
        }
    };

    const resetForm = () => {
        setFormData({ curriculum: curricula[0]?.id || 0, code: '', name: '', level: '', description: '' });
        setEditingSubject(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Subjects</h1>
                    <p className="text-gray-600 mt-1">Manage subjects across all curricula and levels</p>
                </div>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />Add Subject
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Entries', value: subjects.length },
                    { label: 'Unique Subjects', value: new Set(subjects.map(s => s.name)).size },
                    { label: 'Curricula', value: grouped.length },
                ].map(s => (
                    <Card key={s.label} className="py-4 px-5">
                        <p className="text-xs font-medium text-gray-500">{s.label}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by subject, code, level or curriculum..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Grouped list */}
            {loading ? (
                <div className="py-16 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-3 text-sm text-gray-500">Loading subjects...</p>
                </div>
            ) : grouped.length === 0 ? (
                <Card>
                    <div className="py-16 text-center">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <h3 className="text-sm font-medium text-gray-900">No subjects found</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {search ? 'No subjects match your search.' : 'Get started by adding a subject.'}
                        </p>
                        {!search && (
                            <Button className="mt-4" onClick={() => { resetForm(); setIsModalOpen(true); }}>
                                <Plus className="mr-2 h-4 w-4" />Add Subject
                            </Button>
                        )}
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {grouped.map(({ curriculumName, curriculumType, subjects: subjectGroups }) => (
                        <CurriculumGroup
                            key={curriculumName}
                            curriculumName={curriculumName}
                            curriculumType={curriculumType}
                            subjectGroups={subjectGroups}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); resetForm(); }}
                title={editingSubject ? 'Edit Subject' : 'Create Subject'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Select
                        label="Curriculum"
                        value={formData.curriculum.toString()}
                        onChange={e => setFormData({ ...formData, curriculum: Number(e.target.value) })}
                        required
                        options={[
                            { value: '', label: 'Select Curriculum' },
                            ...curricula.map(c => ({ value: c.id, label: `${c.name} (${c.curriculum_type_display})` })),
                        ]}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Subject Code" placeholder="e.g., COMP2025"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            required />
                        <Input label="Subject Name" placeholder="e.g., Computer Studies"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required />
                    </div>
                    <Input label="Level" placeholder="e.g., Form 3, Grade 10, all"
                        value={formData.level}
                        onChange={e => setFormData({ ...formData, level: e.target.value })}
                        required />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            rows={3} placeholder="Optional subject description"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="secondary"
                            onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancel</Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
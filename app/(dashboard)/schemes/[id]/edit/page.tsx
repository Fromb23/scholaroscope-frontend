'use client';

// ============================================================================
// (dashboard)/schemes/[id]/edit/page.tsx
// Edit Scheme with Week Plans and Lesson Management
// ============================================================================

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Edit,
    X,
    Calendar,
    BookOpen,
    FileText,
    MessageSquare
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { DataTable, Column } from '@/app/components/ui/Table';

// Load existing scheme data
const dummyScheme = {
    id: 1,
    cohort_subject: 1,
    cohort_subject_name: 'Form 3 East - Mathematics',
    term: 1,
    term_name: 'Term 1 2026',
    curriculum_model: 'CBC',
    start_date: '2026-01-06',
    end_date: '2026-04-11',
    lessons_per_week: 3,
    status: 'ACTIVE'
};

const dummyWeekPlans = [
    {
        id: 1,
        week_number: 2,
        week_start: '2026-01-13',
        week_end: '2026-01-17',
        lessons_per_week: 3,
        lessons: [
            {
                id: 1,
                sequence_number: 1,
                topic: 'Binary Number Systems',
                sub_topic: 'Introduction',
                strand: 'Numbers',
                sub_strand: 'Number Systems',
                learning_outcomes: ['Understand binary', 'Convert binary to decimal'],
                resources: 'Charts, worksheets',
                materials: ['Binary charts', 'Practice sheets']
            }
        ]
    },
    {
        id: 2,
        week_number: 3,
        week_start: '2026-01-20',
        week_end: '2026-01-24',
        lessons_per_week: 3,
        lessons: []
    }
];

interface Lesson {
    id?: number;
    sequence_number: number;
    topic: string;
    sub_topic: string;
    strand: string;
    sub_strand: string;
    learning_outcomes: string[];
    resources: string;
    materials: string[];
    content_description?: string;
    references?: string[];
}

export default function SchemeEditPage() {
    const params = useParams();
    const router = useRouter();
    const schemeId = Number(params.id);

    const [scheme, setScheme] = useState(dummyScheme);
    const [weekPlans, setWeekPlans] = useState(dummyWeekPlans);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [showLessonModal, setShowLessonModal] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [lessonForm, setLessonForm] = useState<Lesson>({
        sequence_number: 1,
        topic: '',
        sub_topic: '',
        strand: '',
        sub_strand: '',
        learning_outcomes: [''],
        resources: '',
        materials: ['']
    });

    const handleSaveScheme = () => {
        console.log('Saving scheme...', { scheme, weekPlans });
        router.push(`/dashboard/schemes/${schemeId}`);
    };

    const handleAddLesson = (weekId: number) => {
        setSelectedWeek(weekId);
        setEditingLesson(null);
        setLessonForm({
            sequence_number: 1,
            topic: '',
            sub_topic: '',
            strand: '',
            sub_strand: '',
            learning_outcomes: [''],
            resources: '',
            materials: ['']
        });
        setShowLessonModal(true);
    };

    const handleEditLesson = (weekId: number, lesson: Lesson) => {
        setSelectedWeek(weekId);
        setEditingLesson(lesson);
        setLessonForm(lesson);
        setShowLessonModal(true);
    };

    const handleDeleteLesson = (weekId: number, lessonId: number) => {
        if (confirm('Delete this lesson?')) {
            setWeekPlans(weekPlans.map(week =>
                week.id === weekId
                    ? { ...week, lessons: week.lessons.filter(l => l.id !== lessonId) }
                    : week
            ));
        }
    };

    const handleSaveLesson = () => {
        if (!selectedWeek) return;

        setWeekPlans(weekPlans.map(week => {
            if (week.id === selectedWeek) {
                if (editingLesson) {
                    return {
                        ...week,
                        lessons: week.lessons.map(l =>
                            l.id === editingLesson.id ? { ...lessonForm, id: editingLesson.id } : l
                        )
                    };
                } else {
                    return {
                        ...week,
                        lessons: [...week.lessons, { ...lessonForm, id: Date.now() } as Lesson & { id: number }]
                    };
                }
            }
            return week;
        }));

        setShowLessonModal(false);
        setEditingLesson(null);
    };

    const addArrayItem = (field: keyof Lesson) => {
        setLessonForm({
            ...lessonForm,
            [field]: [...(lessonForm[field] as string[]), '']
        });
    };

    const updateArrayItem = (field: keyof Lesson, index: number, value: string) => {
        const arr = [...(lessonForm[field] as string[])];
        arr[index] = value;
        setLessonForm({ ...lessonForm, [field]: arr });
    };

    const removeArrayItem = (field: keyof Lesson, index: number) => {
        setLessonForm({
            ...lessonForm,
            [field]: (lessonForm[field] as string[]).filter((_, i) => i !== index)
        });
    };

    // Columns for lessons table in each week
    const lessonColumns: Column<any>[] = [
        {
            key: 'sequence_number',
            header: '#',
            render: (lesson) => (
                <Badge variant="default" size="sm">L{lesson.sequence_number}</Badge>
            )
        },
        {
            key: 'topic',
            header: 'Topic',
            render: (lesson) => (
                <div>
                    <p className="font-medium text-gray-900">{lesson.topic}</p>
                    <p className="text-sm text-gray-500">{lesson.sub_topic}</p>
                </div>
            )
        },
        {
            key: 'strand',
            header: 'Strand',
            render: (lesson) => (
                <div className="text-sm">
                    <p className="text-gray-900">{lesson.strand}</p>
                    <p className="text-gray-500">{lesson.sub_strand}</p>
                </div>
            )
        },
        {
            key: 'learning_outcomes',
            header: 'Outcomes',
            render: (lesson) => (
                <span className="text-sm text-gray-600">
                    {lesson.learning_outcomes?.length || 0} outcomes
                </span>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row: any) => (
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditLesson(row.week.id, row)}
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteLesson(row.week.id, row.id!)}
                    >
                        <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href={`/dashboard/schemes/${schemeId}`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Scheme
                    </Button>
                </Link>
                <Button onClick={handleSaveScheme}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            </div>

            {/* Scheme Info */}
            <Card>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Scheme Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                            <p className="text-gray-900 font-medium">{scheme.cohort_subject_name}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                            <p className="text-gray-900 font-medium">{scheme.term_name}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                            <input
                                type="date"
                                value={scheme.start_date}
                                onChange={(e) => setScheme({ ...scheme, start_date: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                            <input
                                type="date"
                                value={scheme.end_date}
                                onChange={(e) => setScheme({ ...scheme, end_date: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lessons Per Week</label>
                            <input
                                type="number"
                                min="1"
                                max="7"
                                value={scheme.lessons_per_week}
                                onChange={(e) => setScheme({ ...scheme, lessons_per_week: Number(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Week Plans */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Week Plans & Lessons</h2>

                {weekPlans.map((week) => (
                    <Card key={week.id}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-700">
                                        W{week.week_number}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Week {week.week_number}</h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(week.week_start).toLocaleDateString()} - {new Date(week.week_end).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <Button size="sm" onClick={() => handleAddLesson(week.id)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Lesson
                                </Button>
                            </div>

                            {week.lessons.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-lg">
                                    <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">No lessons planned</p>
                                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => handleAddLesson(week.id)}>
                                        Add First Lesson
                                    </Button>
                                </div>
                            ) : (
                                <DataTable
                                    data={week.lessons.map(l => ({ ...l, week }))}
                                    columns={lessonColumns}
                                    enableSearch={false}
                                    enableSort={false}
                                    emptyMessage="No lessons"
                                />
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Lesson Modal */}
            <Modal
                isOpen={showLessonModal}
                onClose={() => setShowLessonModal(false)}
                title={editingLesson ? 'Edit Lesson' : 'Add Lesson'}
                size="lg"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSaveLesson(); }} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Topic *</label>
                            <input
                                type="text"
                                value={lessonForm.topic}
                                onChange={(e) => setLessonForm({ ...lessonForm, topic: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sub-topic</label>
                            <input
                                type="text"
                                value={lessonForm.sub_topic}
                                onChange={(e) => setLessonForm({ ...lessonForm, sub_topic: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* CBC Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Strand</label>
                            <input
                                type="text"
                                value={lessonForm.strand}
                                onChange={(e) => setLessonForm({ ...lessonForm, strand: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sub-strand</label>
                            <input
                                type="text"
                                value={lessonForm.sub_strand}
                                onChange={(e) => setLessonForm({ ...lessonForm, sub_strand: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Learning Outcomes */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Learning Outcomes</label>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => addArrayItem('learning_outcomes')}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {lessonForm.learning_outcomes.map((outcome, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={outcome}
                                        onChange={(e) => updateArrayItem('learning_outcomes', idx, e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter learning outcome..."
                                    />
                                    {lessonForm.learning_outcomes.length > 1 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeArrayItem('learning_outcomes', idx)}
                                        >
                                            <X className="w-4 h-4 text-red-600" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Content Description</label>
                        <textarea
                            value={lessonForm.content_description || ''}
                            onChange={(e) => setLessonForm({ ...lessonForm, content_description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe what will be taught..."
                        />
                    </div>

                    {/* Resources */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resources</label>
                        <textarea
                            value={lessonForm.resources}
                            onChange={(e) => setLessonForm({ ...lessonForm, resources: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="List resources needed..."
                        />
                    </div>

                    {/* Materials */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Materials</label>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => addArrayItem('materials')}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {lessonForm.materials.map((material, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={material}
                                        onChange={(e) => updateArrayItem('materials', idx, e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter material..."
                                    />
                                    {lessonForm.materials.length > 1 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeArrayItem('materials', idx)}
                                        >
                                            <X className="w-4 h-4 text-red-600" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowLessonModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            <Save className="w-4 h-4 mr-2" />
                            Save Lesson
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
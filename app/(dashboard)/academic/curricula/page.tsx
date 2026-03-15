// ============================================================================
// app/(dashboard)/academic/curricula/page.tsx - Curricula Management Page
// ============================================================================

'use client';

import { useState } from 'react';
import { BookOpen, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { Curriculum } from '@/app/core/types/academic';

export default function CurriculaPage() {
    const [showModal, setShowModal] = useState(false);
    const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        curriculum_type: '',
        description: '',
        is_active: true
    });

    const { curricula, loading, createCurriculum, updateCurriculum, deleteCurriculum } = useCurricula();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCurriculum) {
                await updateCurriculum(editingCurriculum.id, formData);
            } else {
                await createCurriculum(formData);
            }
            setShowModal(false);
            resetForm();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleEdit = (curriculum: Curriculum) => {
        setEditingCurriculum(curriculum);
        setFormData({
            name: curriculum.name,
            curriculum_type: curriculum.curriculum_type,
            description: curriculum.description || '',
            is_active: curriculum.is_active
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this curriculum? This will affect all associated subjects and cohorts.')) {
            try {
                await deleteCurriculum(id);
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            curriculum_type: '',
            description: '',
            is_active: true
        });
        setEditingCurriculum(null);
    };

    const activeCurricula = curricula.filter(c => c.is_active);
    const inactiveCurricula = curricula.filter(c => !c.is_active);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Curricula</h1>
                    <p className="mt-2 text-gray-600">Manage educational curricula and programs</p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Curriculum
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Curricula</p>
                            <p className="text-2xl font-bold text-gray-900">{curricula.length}</p>
                        </div>
                        <BookOpen className="h-8 w-8 text-blue-600" />
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Active</p>
                            <p className="text-2xl font-bold text-green-600">{activeCurricula.length}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Inactive</p>
                            <p className="text-2xl font-bold text-gray-600">{inactiveCurricula.length}</p>
                        </div>
                        <BookOpen className="h-8 w-8 text-gray-400" />
                    </div>
                </Card>
            </div>

            {/* Active Curricula */}
            <Card>
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Active Curricula</h2>
                </div>
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading curricula...</p>
                    </div>
                ) : activeCurricula.length === 0 ? (
                    <div className="py-12 text-center">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No active curricula</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new curriculum</p>
                        <Button className="mt-4" onClick={() => setShowModal(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Curriculum
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Subjects</TableHead>
                                <TableHead>Cohorts</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeCurricula.map((curriculum) => (
                                <TableRow key={curriculum.id}>
                                    <TableCell>
                                        <span className="font-mono font-medium">{curriculum.curriculum_type}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{curriculum.name}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-gray-600">{curriculum.description || '-'}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="info">{curriculum.subjects_count || 0}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="info">{curriculum.cohorts_count || 0}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEdit(curriculum)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDelete(curriculum.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Inactive Curricula */}
            {inactiveCurricula.length > 0 && (
                <Card>
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Inactive Curricula</h2>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inactiveCurricula.map((curriculum) => (
                                <TableRow key={curriculum.id} className="opacity-60">
                                    <TableCell>
                                        <span className="font-mono font-medium">{curriculum.curriculum_type}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{curriculum.name}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-gray-600">{curriculum.description || '-'}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEdit(curriculum)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDelete(curriculum.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    resetForm();
                }}
                title={editingCurriculum ? 'Edit Curriculum' : 'Add New Curriculum'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Curriculum Code"
                        value={formData.curriculum_type}
                        onChange={(e) => setFormData({ ...formData, curriculum_type: e.target.value })}
                        placeholder="e.g., CBC, 8-4-4"
                        required
                    />

                    <Input
                        label="Curriculum Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Competency Based Curriculum"
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of the curriculum"
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                            Active Curriculum
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setShowModal(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingCurriculum ? 'Update Curriculum' : 'Create Curriculum'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
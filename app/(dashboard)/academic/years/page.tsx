'use client';

import { useState } from 'react';
import { Calendar, Plus, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { useAcademicYears } from '@/app/core/hooks/useAcademic';
import { AcademicYear, AcademicYearFormData } from '@/app/core/types/academic';

export default function AcademicYearsPage() {
    const { academicYears, loading, createAcademicYear, updateAcademicYear, deleteAcademicYear, setCurrentYear } = useAcademicYears();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
    const [formData, setFormData] = useState<AcademicYearFormData>({
        name: '',
        start_date: '',
        end_date: '',
        is_current: false
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingYear) {
                await updateAcademicYear(editingYear.id, formData);
            } else {
                await createAcademicYear(formData);
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (year: AcademicYear) => {
        setEditingYear(year);
        setFormData({
            name: year.name,
            start_date: year.start_date,
            end_date: year.end_date,
            is_current: year.is_current
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this academic year?')) {
            try {
                await deleteAcademicYear(id);
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const handleSetCurrent = async (id: number) => {
        try {
            await setCurrentYear(id);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            start_date: '',
            end_date: '',
            is_current: false
        });
        setEditingYear(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Academic Years</h1>
                    <p className="text-gray-600 mt-1">Manage academic year configurations</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Academic Year
                </Button>
            </div>

            {/* Table */}
            <Card>
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading academic years...</p>
                    </div>
                ) : academicYears.length === 0 ? (
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No academic years found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by adding a new academic year</p>
                        <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Academic Year
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Academic Year</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Terms</TableHead>
                                <TableHead>Cohorts</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {academicYears.map((year) => (
                                <TableRow key={year.id}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium text-gray-900">{year.name}</div>
                                            {year.is_current && (
                                                <Badge variant="green" size="sm" className="mt-1">Current</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm text-gray-600">
                                            {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="blue">{year.terms_count}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="purple">{year.cohorts_count}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {!year.is_current && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleSetCurrent(year.id)}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Set Current
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(year)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(year.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    resetForm();
                }}
                title={editingYear ? 'Edit Academic Year' : 'Create Academic Year'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Name"
                        placeholder="e.g., 2024, 2024-2025"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Start Date"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            required
                        />

                        <Input
                            label="End Date"
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            required
                        />
                    </div>

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.is_current}
                            onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                            className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Set as current academic year</span>
                    </label>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => {
                                setIsModalOpen(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : editingYear ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
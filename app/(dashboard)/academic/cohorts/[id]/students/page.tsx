'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, UserPlus, UserMinus, Search,
    Users, CheckSquare, Square, AlertCircle,
} from 'lucide-react';
import { cohortAPI } from '@/app/core/api/academic';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { EnrollmentTypes } from '@/app/core/types/student';

interface EnrolledStudent {
    id: number;
    admission_number: string;
    full_name: string;
    enrollment_id: number;
    enrollment_type: string;
    enrolled_date: string;
    is_primary_cohort: boolean;
    email: string;
    phone: string;
}

interface AvailableStudent {
    id: number;
    admission_number: string;
    full_name: string;
    primary_cohort_name?: string;
    email: string;
}

// ── Student list item ─────────────────────────────────────────────────────

function StudentItem({
    name, admNo, meta, selected, onClick, variant = 'default',
}: {
    name: string;
    admNo: string;
    meta?: string;
    selected: boolean;
    onClick: () => void;
    variant?: 'default' | 'enrolled';
}) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${selected
                ? variant === 'enrolled'
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-green-50 border-green-300'
                : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                }`}
        >
            <div className="shrink-0">
                {selected
                    ? <CheckSquare className={`h-4 w-4 ${variant === 'enrolled' ? 'text-blue-600' : 'text-green-600'}`} />
                    : <Square className="h-4 w-4 text-gray-300" />
                }
            </div>
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                {name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-400">{admNo}{meta ? ` · ${meta}` : ''}</p>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function CohortStudentsPage() {
    const params = useParams();
    const cohortId = Number(params.id);

    const [cohortName, setCohortName] = useState('');
    const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
    const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
    const [selectedEnrolled, setSelectedEnrolled] = useState<Set<number>>(new Set());
    const [selectedAvailable, setSelectedAvailable] = useState<Set<number>>(new Set());
    const [searchEnrolled, setSearchEnrolled] = useState('');
    const [searchAvailable, setSearchAvailable] = useState('');
    const [loading, setLoading] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [showUnenrollModal, setShowUnenrollModal] = useState(false);
    const [enrollmentType, setEnrollmentType] = useState('ELECTIVE');
    const [notes, setNotes] = useState('');

    useEffect(() => { loadData(); }, [cohortId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [enrolled, available] = await Promise.all([
                cohortAPI.getEnrolledStudents(cohortId),
                cohortAPI.getAvailableStudents(cohortId),
            ]);
            setEnrolledStudents(enrolled);
            setAvailableStudents(available);
            setCohortName(enrolled.cohort_name);
        } catch { alert('Failed to load student data'); }
        finally { setLoading(false); }
    };

    const handleSearchAvailable = async () => {
        try {
            const data = await cohortAPI.getAvailableStudents(cohortId, searchAvailable);
            setAvailableStudents(data.available_students ?? data);
        } catch { console.error('Search failed'); }
    };

    const handleBulkEnroll = async () => {
        if (selectedAvailable.size === 0) return;
        setLoading(true);
        try {
            const result = await cohortAPI.bulkEnrollStudents(
                cohortId, Array.from(selectedAvailable), enrollmentType, notes || 'Bulk enrollment'
            );
            alert(`Enrollment complete!\nCreated: ${result.created}\nReactivated: ${result.reactivated}\nAlready Active: ${result.already_active}`);
            setShowEnrollModal(false);
            setSelectedAvailable(new Set());
            setEnrollmentType('ELECTIVE');
            setNotes('');
            await loadData();
        } catch { alert('Failed to enroll students'); }
        finally { setLoading(false); }
    };

    const handleBulkUnenroll = async () => {
        if (selectedEnrolled.size === 0) return;
        setLoading(true);
        try {
            const result = await cohortAPI.bulkUnenrollStudents(
                cohortId, Array.from(selectedEnrolled), notes || 'Bulk unenrollment'
            );
            let msg = `Unenrollment complete!\nRemoved: ${result.unenrolled}`;
            if (result.primary_cleared > 0) msg += `\nPrimary cohort cleared for ${result.primary_cleared} student(s)`;
            alert(msg);
            setShowUnenrollModal(false);
            setSelectedEnrolled(new Set());
            setNotes('');
            await loadData();
        } catch { alert('Failed to unenroll students'); }
        finally { setLoading(false); }
    };

    const toggleEnrolled = (id: number) => {
        const s = new Set(selectedEnrolled);
        s.has(id) ? s.delete(id) : s.add(id);
        setSelectedEnrolled(s);
    };

    const toggleAvailable = (id: number) => {
        const s = new Set(selectedAvailable);
        s.has(id) ? s.delete(id) : s.add(id);
        setSelectedAvailable(s);
    };

    const filteredEnrolled = enrolledStudents?.filter(s =>
        s.full_name.toLowerCase().includes(searchEnrolled.toLowerCase()) ||
        s.admission_number.toLowerCase().includes(searchEnrolled.toLowerCase())
    ) ?? [];

    const filteredAvailable = availableStudents?.filter(s =>
        s.full_name.toLowerCase().includes(searchAvailable.toLowerCase()) ||
        s.admission_number.toLowerCase().includes(searchAvailable.toLowerCase())
    ) ?? [];

    const allEnrolledSelected = filteredEnrolled.length > 0 && selectedEnrolled.size === filteredEnrolled.length;
    const allAvailableSelected = filteredAvailable.length > 0 && selectedAvailable.size === filteredAvailable.length;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/academic/cohorts">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />Back to Cohorts
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage Students</h1>
                        {cohortName && <p className="text-sm text-gray-500 mt-0.5">{cohortName}</p>}
                    </div>
                </div>
                <Link href="/assessments">
                    <Button variant="secondary" size="sm">View Assessments</Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatsCard title="Enrolled" value={enrolledStudents?.length ?? 0} icon={Users} color="blue" />
                <StatsCard title="Available" value={availableStudents?.length ?? 0} icon={UserPlus} color="green" />
                <StatsCard title="Selected" value={selectedEnrolled.size + selectedAvailable.size} icon={CheckSquare} color="yellow" />
            </div>

            {/* Two-panel layout */}
            <div className="grid gap-6 lg:grid-cols-2">

                {/* Enrolled */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-gray-900">
                            Enrolled
                            <Badge variant="info" size="sm" className="ml-2">{enrolledStudents?.length ?? 0}</Badge>
                        </h2>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowUnenrollModal(true)}
                            disabled={selectedEnrolled.size === 0}
                            className="text-red-600 hover:bg-red-50"
                        >
                            <UserMinus className="h-4 w-4 mr-1" />
                            Remove ({selectedEnrolled.size})
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={searchEnrolled}
                            onChange={e => setSearchEnrolled(e.target.value)}
                            placeholder="Search enrolled..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Select all */}
                    {filteredEnrolled.length > 0 && (
                        <button
                            onClick={() => setSelectedEnrolled(
                                allEnrolledSelected ? new Set() : new Set(filteredEnrolled.map(s => s.id))
                            )}
                            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium mb-2 px-1"
                        >
                            {allEnrolledSelected
                                ? <CheckSquare className="h-3.5 w-3.5" />
                                : <Square className="h-3.5 w-3.5" />
                            }
                            {allEnrolledSelected ? 'Deselect all' : 'Select all'}
                        </button>
                    )}

                    {/* List */}
                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                        {loading ? (
                            <div className="py-10 text-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
                            </div>
                        ) : filteredEnrolled.length === 0 ? (
                            <div className="py-10 text-center">
                                <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">No enrolled students</p>
                            </div>
                        ) : filteredEnrolled.map(s => (
                            <StudentItem
                                key={s.id}
                                name={s.full_name}
                                admNo={s.admission_number}
                                meta={s.enrollment_type}
                                selected={selectedEnrolled.has(s.id)}
                                onClick={() => toggleEnrolled(s.id)}
                                variant="enrolled"
                            />
                        ))}
                    </div>
                </Card>

                {/* Available */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-gray-900">
                            Available
                            <Badge variant="green" size="sm" className="ml-2">{availableStudents?.length ?? 0}</Badge>
                        </h2>
                        <Button
                            size="sm"
                            onClick={() => setShowEnrollModal(true)}
                            disabled={selectedAvailable.size === 0}
                        >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Enroll ({selectedAvailable.size})
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                value={searchAvailable}
                                onChange={e => setSearchAvailable(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearchAvailable()}
                                placeholder="Search available..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <Button size="sm" variant="secondary" onClick={handleSearchAvailable}>
                            Search
                        </Button>
                    </div>

                    {/* Select all */}
                    {filteredAvailable.length > 0 && (
                        <button
                            onClick={() => setSelectedAvailable(
                                allAvailableSelected ? new Set() : new Set(filteredAvailable.map(s => s.id))
                            )}
                            className="flex items-center gap-2 text-xs text-green-600 hover:text-green-700 font-medium mb-2 px-1"
                        >
                            {allAvailableSelected
                                ? <CheckSquare className="h-3.5 w-3.5" />
                                : <Square className="h-3.5 w-3.5" />
                            }
                            {allAvailableSelected ? 'Deselect all' : 'Select all'}
                        </button>
                    )}

                    {/* List */}
                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                        {loading ? (
                            <div className="py-10 text-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
                            </div>
                        ) : filteredAvailable.length === 0 ? (
                            <div className="py-10 text-center">
                                <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">No available students</p>
                            </div>
                        ) : filteredAvailable.map(s => (
                            <StudentItem
                                key={s.id}
                                name={s.full_name}
                                admNo={s.admission_number}
                                meta={s.primary_cohort_name}
                                selected={selectedAvailable.has(s.id)}
                                onClick={() => toggleAvailable(s.id)}
                                variant="default"
                            />
                        ))}
                    </div>
                </Card>
            </div>

            {/* Enroll Modal */}
            <Modal
                isOpen={showEnrollModal}
                onClose={() => { setShowEnrollModal(false); setEnrollmentType('ELECTIVE'); setNotes(''); }}
                title={`Enroll ${selectedAvailable.size} Student${selectedAvailable.size !== 1 ? 's' : ''}`}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                        Enrolling <strong>{selectedAvailable.size}</strong> student{selectedAvailable.size !== 1 ? 's' : ''} into <strong>{cohortName}</strong>
                    </div>
                    <Select
                        label="Enrollment Type"
                        value={enrollmentType}
                        onChange={e => setEnrollmentType(e.target.value)}
                        options={EnrollmentTypes}
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add notes about this enrollment..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button variant="secondary" onClick={() => { setShowEnrollModal(false); setNotes(''); }}>Cancel</Button>
                        <Button onClick={handleBulkEnroll} disabled={loading}>
                            {loading ? 'Enrolling...' : 'Enroll Students'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Unenroll Modal */}
            <Modal
                isOpen={showUnenrollModal}
                onClose={() => { setShowUnenrollModal(false); setNotes(''); }}
                title={`Remove ${selectedEnrolled.size} Student${selectedEnrolled.size !== 1 ? 's' : ''}`}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-800 font-medium mb-1">This will:</p>
                        <ul className="text-sm text-red-700 space-y-0.5 list-disc list-inside">
                            <li>Deactivate their subject enrollments</li>
                            <li>Remove future attendance records</li>
                            <li>Update primary cohort if applicable</li>
                        </ul>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Add reason for removal..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button variant="secondary" onClick={() => { setShowUnenrollModal(false); setNotes(''); }}>Cancel</Button>
                        <Button onClick={handleBulkUnenroll} disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white">
                            {loading ? 'Removing...' : 'Remove Students'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
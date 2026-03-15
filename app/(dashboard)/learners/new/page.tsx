'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { learnersAPI } from '@/app/core/api/learners';
import { useCohorts } from '@/app/core/hooks/useAcademic';
import { subjectAPI } from '@/app/core/api/academic';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { Subject } from '@/app/core/types/academic';

export default function NewStudentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    const { cohorts } = useCohorts();

    const [formData, setFormData] = useState({
        admission_number: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        cohort: '',
        email: '',
        phone: '',
        subject_ids: [] as number[],
    });

    // Fetch subjects when cohort changes
    useEffect(() => {
        if (!formData.cohort) {
            setSubjects([]);
            setFormData(prev => ({ ...prev, subject_ids: [] }));
            return;
        }

        const selectedCohort = cohorts.find(c => c.id === Number(formData.cohort));
        if (!selectedCohort) return;

        const fetchSubjects = async () => {
            try {
                setLoadingSubjects(true);
                const data = await subjectAPI.getAll();
                const subjectsArray = Array.isArray(data)
                    ? data
                    : (data as any).results ?? []
                setSubjects(subjectsArray);
            } catch (err) {
                console.error('Failed to fetch subjects:', err);
                setSubjects([]);
            } finally {
                setLoadingSubjects(false);
            }
        };

        fetchSubjects();
    }, [formData.cohort, cohorts]);

    const handleSubjectToggle = (subjectId: number) => {
        setFormData(prev => {
            const isSelected = prev.subject_ids.includes(subjectId);
            const newSubjectIds = isSelected
                ? prev.subject_ids.filter(id => id !== subjectId)
                : [...prev.subject_ids, subjectId];

            return { ...prev, subject_ids: newSubjectIds };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const studentData = {
                admission_number: formData.admission_number,
                first_name: formData.first_name,
                middle_name: formData.middle_name || undefined,
                last_name: formData.last_name,
                date_of_birth: formData.date_of_birth || undefined,
                gender: formData.gender || undefined,
                cohort: Number(formData.cohort),
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                subject_ids: formData.subject_ids.length > 0 ? formData.subject_ids : undefined,
            };

            await learnersAPI.createStudent(studentData);
            router.push('/learners');
        } catch (err: any) {
            const errorMsg = err.response?.data?.admission_number?.[0] ||
                err.response?.data?.detail ||
                err.response?.data?.message ||
                'Failed to create student';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/learners">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Add New Student</h1>
                    <p className="mt-2 text-gray-600">Register a new student in the system</p>
                </div>
            </div>

            {/* Form */}
            <Card>
                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                label="Admission Number"
                                required
                                value={formData.admission_number}
                                onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                                placeholder="2025001"
                            />
                            <Select
                                label="Cohort"
                                required
                                value={formData.cohort}
                                onChange={(e) => setFormData({ ...formData, cohort: e.target.value })}
                                options={[
                                    { value: '', label: 'Select cohort...' },
                                    ...cohorts.map(c => ({ value: c.id, label: c.name }))
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Input
                            label="First Name"
                            required
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            placeholder="John"
                        />
                        <Input
                            label="Middle Name (Optional)"
                            value={formData.middle_name}
                            onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                            placeholder="Kamau"
                        />
                        <Input
                            label="Last Name"
                            required
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            placeholder="Mwangi"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Date of Birth (Optional)"
                            type="date"
                            value={formData.date_of_birth}
                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        />
                        <Select
                            label="Gender"
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            options={[
                                { value: '', label: 'Select gender...' },
                                { value: 'Male', label: 'Male' },
                                { value: 'Female', label: 'Female' },
                            ]}
                        />
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                label="Email (Optional)"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john.mwangi@student.school.com"
                            />
                            <Input
                                label="Phone (Optional)"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+254712345678"
                            />
                        </div>
                    </div>

                    {/* Subject Selection */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Enrollment</h3>

                        {!formData.cohort ? (
                            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-600">
                                Please select a cohort first to view available subjects
                            </div>
                        ) : loadingSubjects ? (
                            <div className="py-8 text-center">
                                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                <p className="mt-2 text-sm text-gray-600">Loading subjects...</p>
                            </div>
                        ) : subjects.length === 0 ? (
                            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-600">
                                No subjects available for this cohort's curriculum
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Select Subject(s) <span className="text-gray-500">(Optional - can be added later)</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {subjects.map((subject) => {
                                        const isSelected = formData.subject_ids.includes(subject.id);
                                        return (
                                            <button
                                                type="button"
                                                key={subject.id}
                                                onClick={() => handleSubjectToggle(subject.id)}
                                                className={`
                                                    px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                                                    ${isSelected
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                                    }
                                                `}
                                            >
                                                {subject.code} - {subject.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                {formData.subject_ids.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-sm text-gray-600 mb-2">
                                            Selected subjects ({formData.subject_ids.length}):
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.subject_ids.map(id => {
                                                const subject = subjects.find(s => s.id === id);
                                                return subject ? (
                                                    <Badge key={id} variant="success">
                                                        {subject.code}
                                                    </Badge>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4 border-t">
                        <Button type="submit" disabled={loading}>
                            <Save className="mr-2 h-4 w-4" />
                            {loading ? 'Creating...' : 'Create Student'}
                        </Button>
                        <Link href="/learners">
                            <Button type="button" variant="ghost">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            </Card>
        </div>
    );
}
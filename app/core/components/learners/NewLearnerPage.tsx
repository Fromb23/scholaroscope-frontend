'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Save } from 'lucide-react';
import Link from 'next/link';
import { learnersAPI } from '@/app/core/api/learners';
import { useCohortDetail, useCohorts } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';

const INITIAL_FORM_DATA = {
    admission_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    cohort: '',
    email: '',
    phone: '',
};

interface CreatedLearnerState {
    cohortId: number;
    cohortName: string;
    learnerName: string;
}

function getLearnerCreationError(error: unknown) {
    if (
        error
        && typeof error === 'object'
        && 'response' in error
        && error.response
        && typeof error.response === 'object'
        && 'data' in error.response
    ) {
        const data = error.response.data as {
            admission_number?: string[];
            detail?: string;
            message?: string;
        };

        return data.admission_number?.[0]
            || data.detail
            || data.message
            || 'Failed to create learner';
    }

    return 'Failed to create learner';
}

export default function NewStudentPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdLearner, setCreatedLearner] = useState<CreatedLearnerState | null>(null);

    const { cohorts } = useCohorts();

    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const selectedCohortId = formData.cohort ? Number(formData.cohort) : null;
    const selectedCohort = useMemo(
        () => cohorts.find((cohort) => cohort.id === selectedCohortId) ?? null,
        [cohorts, selectedCohortId]
    );
    const { cohort: createdCohort, loading: createdCohortLoading } = useCohortDetail(createdLearner?.cohortId ?? null);
    const quickActionSubjects = createdCohort?.subjects ?? [];

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
            };

            const createdStudent = await learnersAPI.createStudent(studentData);
            const learnerName = createdStudent.full_name?.trim()
                || `${formData.first_name} ${formData.last_name}`.trim();

            setCreatedLearner({
                cohortId: studentData.cohort,
                cohortName: selectedCohort?.name ?? `Cohort #${studentData.cohort}`,
                learnerName,
            });
        } catch (error) {
            setError(getLearnerCreationError(error));
        } finally {
            setLoading(false);
        }
    };

    if (createdLearner) {
        return (
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/learners">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Learners
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Learner Created</h1>
                        <p className="mt-2 text-gray-600">
                            {createdLearner.learnerName} was placed in {createdLearner.cohortName}.
                        </p>
                    </div>
                </div>

                <Card>
                    <div className="space-y-5">
                        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                            <div className="space-y-1">
                                <p className="font-medium text-green-900">Learner created and placed in cohort. Assign subjects separately.</p>
                                <p>Use the cohort control center or learner profile to manage subject participation for this learner.</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link href={`/academic/cohorts/${createdLearner.cohortId}`} className="w-full sm:w-auto">
                                <Button className="w-full">
                                    Open Cohort Control Center
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full sm:w-auto"
                                onClick={() => {
                                    setCreatedLearner(null);
                                    setError('');
                                    setFormData(INITIAL_FORM_DATA);
                                }}
                            >
                                Create Another Learner
                            </Button>
                        </div>
                    </div>
                </Card>

                {createdCohortLoading ? (
                    <Card>
                        <p className="text-sm text-gray-500">Loading cohort subject actions...</p>
                    </Card>
                ) : quickActionSubjects.length > 0 ? (
                    <section className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold text-gray-900">Quick Subject Actions</h2>
                            <p className="text-sm text-gray-500">
                                Open the subject learner pages directly for this cohort.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {quickActionSubjects.map((subject) => (
                                <Card key={subject.id}>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 space-y-1">
                                            <h3 className="text-base font-semibold text-gray-900">{subject.subject_name}</h3>
                                            <p className="text-sm text-gray-500">{subject.subject_code}</p>
                                        </div>
                                        <Link
                                            href={`/academic/cohort-subjects/${subject.id}/learners`}
                                            className="w-full shrink-0 sm:w-auto"
                                        >
                                            <Button size="sm" className="w-full sm:w-auto">
                                                Manage Learners
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>
        );
    }

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
                    <h1 className="text-3xl font-bold text-gray-900">Add New Learner</h1>
                    <p className="mt-2 text-gray-600">Create learner identity and place the learner in a cohort.</p>
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

                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                        Learner creation places the learner in a cohort only. Assign subjects separately from cohort subject management.
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4 border-t">
                        <Button type="submit" disabled={loading}>
                            <Save className="mr-2 h-4 w-4" />
                            {loading ? 'Creating...' : 'Create Learner'}
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

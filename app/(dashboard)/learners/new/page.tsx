'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { learnersAPI } from '@/app/core/api/learners';
import { useCohorts } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';

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
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
    });

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

            await learnersAPI.createStudent(studentData);
            router.push('/learners?created=1');
        } catch (error) {
            setError(getLearnerCreationError(error));
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

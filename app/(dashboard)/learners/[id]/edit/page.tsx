'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Info } from 'lucide-react';
import { useStudent } from '@/app/core/hooks/useStudents';
import { learnersAPI } from '@/app/core/api/learners';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';

interface EditForm {
    admission_number: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    email: string;
    phone: string;
}

export default function EditLearnerPage() {
    const params = useParams();
    const router = useRouter();
    const studentId = Number(params.id);

    const { student, loading } = useStudent(studentId);
    const [form, setForm] = useState<EditForm>({
        admission_number: '', first_name: '', middle_name: '',
        last_name: '', date_of_birth: '', gender: 'MALE', email: '', phone: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!student) return;
        const parts = student.full_name.split(' ');
        setForm({
            admission_number: student.admission_number,
            first_name: student.first_name ?? parts[0] ?? '',
            middle_name: student.middle_name ?? (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''),
            last_name: student.last_name ?? parts[parts.length - 1] ?? '',
            date_of_birth: student.date_of_birth ?? '',
            gender: student.gender ?? 'MALE',
            email: student.email ?? '',
            phone: student.phone ?? '',
        });
    }, [student]);

    const setField = (key: keyof EditForm, value: string) =>
        setForm(f => ({ ...f, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            await learnersAPI.updateStudent(studentId, {
                ...form,
                date_of_birth: form.date_of_birth || null,
            });
            router.push(`/learners/${studentId}`);
        } catch (err: unknown) {
            const e = err as { message?: string };
            setError(e.message ?? 'Failed to update student');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner message="Loading student..." />;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <Link href={`/learners/${studentId}`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />Back to Student
                    </Button>
                </Link>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                    <p className="font-medium">Profile Information Only</p>
                    <p>To update cohort enrollment or subject selection, visit the Academic Management pages.</p>
                </div>
            </div>

            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

            <Card>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Edit Learner Profile</h1>
                    <p className="mt-1 text-sm text-gray-600">Update learner's personal information</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Input label="Admission Number" value={form.admission_number} onChange={e => setField('admission_number', e.target.value)} required />
                            <Input label="First Name" value={form.first_name} onChange={e => setField('first_name', e.target.value)} required />
                            <Input label="Middle Name (Optional)" value={form.middle_name} onChange={e => setField('middle_name', e.target.value)} />
                            <Input label="Last Name" value={form.last_name} onChange={e => setField('last_name', e.target.value)} required />
                            <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={e => setField('date_of_birth', e.target.value)} />
                            <Select
                                label="Gender"
                                value={form.gender}
                                onChange={e => setField('gender', e.target.value)}
                                options={[
                                    { value: 'MALE', label: 'Male' },
                                    { value: 'FEMALE', label: 'Female' },
                                ]}
                            />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Input label="Email (Optional)" type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
                            <Input label="Phone (Optional)" type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <Link href={`/learners/${studentId}`}>
                            <Button type="button" variant="ghost">Cancel</Button>
                        </Link>
                        <Button type="submit" disabled={submitting}>
                            {submitting
                                ? <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving...</>
                                : <><Save className="mr-2 h-4 w-4" />Save Changes</>
                            }
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
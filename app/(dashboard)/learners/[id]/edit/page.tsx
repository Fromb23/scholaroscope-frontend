// ============================================================================
// app/(dashboard)/learners/[id]/edit/page.tsx - Edit Learner Page
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Info } from 'lucide-react';
import { learnersAPI } from '@/app/core/api/learners';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { StudentFormData } from '@/app/core/types/student';

export default function EditLearnerPage() {
    const params = useParams();
    const router = useRouter();
    const studentId = Number(params.id);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<StudentFormData>({
        admission_number: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'MALE',
        cohort: 0,
        email: '',
        phone: ''
    });

    useEffect(() => {
        loadStudent();
    }, [studentId]);

    const loadStudent = async () => {
        try {
            setLoading(true);
            const student = await learnersAPI.getStudent(studentId);

            // Extract names from full_name as fallback
            const nameParts = student.full_name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts[nameParts.length - 1] || '';
            const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

            // Populate form with existing student data
            setFormData({
                admission_number: student.admission_number,
                first_name: student.first_name || firstName,
                middle_name: student.middle_name || middleName,
                last_name: student.last_name || lastName,
                date_of_birth: student.date_of_birth || '',
                gender: student.gender || 'MALE', // Now correctly uses server value
                cohort: student.cohort, // Preserved but not editable
                email: student.email || '',
                phone: student.phone || ''
            });
        } catch (error: any) {
            alert('Failed to load student details');
            router.push('/learners');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSubmitting(true);

            // Only include profile fields in the update
            const updateData = {
                admission_number: formData.admission_number,
                first_name: formData.first_name,
                middle_name: formData.middle_name,
                last_name: formData.last_name,
                date_of_birth: formData.date_of_birth || null,
                gender: formData.gender,
                email: formData.email,
                phone: formData.phone
            };

            await learnersAPI.updateStudent(studentId, updateData);
            router.push(`/learners/${studentId}`);
        } catch (error: any) {
            alert(error.message || 'Failed to update student');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (field: keyof StudentFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/learners/${studentId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Student
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Info Banner */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Profile Information Only</p>
                        <p>
                            This page is for editing the learner's personal profile information.
                            To update cohort enrollment or subject selection, please visit the respective
                            Academic Management pages.
                        </p>
                    </div>
                </div>
            </div>

            <Card>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Edit Learner Profile</h1>
                    <p className="mt-1 text-sm text-gray-600">Update learner's personal information</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Input
                                label="Admission Number"
                                value={formData.admission_number}
                                onChange={(e) => handleChange('admission_number', e.target.value)}
                                placeholder="e.g., 2024001"
                                required
                            />

                            <Input
                                label="First Name"
                                value={formData.first_name}
                                onChange={(e) => handleChange('first_name', e.target.value)}
                                placeholder="Enter first name"
                                required
                            />

                            <Input
                                label="Middle Name (Optional)"
                                value={formData.middle_name || ''}
                                onChange={(e) => handleChange('middle_name', e.target.value)}
                                placeholder="Enter middle name"
                            />

                            <Input
                                label="Last Name"
                                value={formData.last_name}
                                onChange={(e) => handleChange('last_name', e.target.value)}
                                placeholder="Enter last name"
                                required
                            />

                            <Input
                                label="Date of Birth"
                                type="date"
                                value={formData.date_of_birth || ''}
                                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                            />

                            <Select
                                label="Gender"
                                value={formData.gender}
                                onChange={(e) => handleChange('gender', e.target.value)}
                                options={[
                                    { value: 'MALE', label: 'Male' },
                                    { value: 'FEMALE', label: 'Female' },
                                    { value: 'M', label: 'M' },
                                    { value: 'F', label: 'F' },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Input
                                label="Email (Optional)"
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="student@example.com"
                            />

                            <Input
                                label="Phone Number (Optional)"
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="+254 700 000 000"
                            />
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <Link href={`/learners/${studentId}`}>
                            <Button type="button" variant="ghost">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
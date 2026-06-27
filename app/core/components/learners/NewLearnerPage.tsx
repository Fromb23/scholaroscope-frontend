'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { learnersAPI } from '@/app/core/api/learners';
import { bulkEnrollCohortSubjectLearners } from '@/app/core/api/academic';
import { useCohortDetail, useCohorts } from '@/app/core/hooks/useAcademic';
import { useAuth } from '@/app/context/AuthContext';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { FormValidationSummary } from '@/app/components/ui/forms';
import { AppErrorBanner } from '@/app/components/ui/errors';
import {
    getFormFieldErrorMessage,
    hasFormFieldErrors,
    normalizeFormFieldErrors,
    useFormValidationFeedback,
    type FormFieldErrors,
} from '@/app/core/forms';
import { resolveLearnerError, type AppError } from '@/app/core/errors';
import { isSelfManagedTeachingWorkspace } from '@/app/core/lib/workspaces';
import { getLearnerCreateReturnTo } from '@/app/core/components/learners/learnerCreateNavigation';

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

type LearnerCreateField =
    | 'admission_number'
    | 'cohort'
    | 'first_name'
    | 'last_name'
    | 'middle_name'
    | 'date_of_birth'
    | 'gender'
    | 'email'
    | 'phone';

const LEARNER_FIELD_ORDER: LearnerCreateField[] = [
    'admission_number',
    'cohort',
    'first_name',
    'last_name',
    'middle_name',
    'date_of_birth',
    'gender',
    'email',
    'phone',
];

const LEARNER_FIELD_LABELS: Record<LearnerCreateField, string> = {
    admission_number: 'Admission number',
    cohort: 'Cohort',
    first_name: 'First name',
    last_name: 'Last name',
    middle_name: 'Middle name',
    date_of_birth: 'Date of birth',
    gender: 'Gender',
    email: 'Email',
    phone: 'Phone',
};

function validateLearnerCreateForm(
    formData: typeof INITIAL_FORM_DATA,
): FormFieldErrors<LearnerCreateField> {
    const errors: FormFieldErrors<LearnerCreateField> = {};

    if (!formData.admission_number.trim()) errors.admission_number = 'Admission number is required.';
    if (!formData.cohort) errors.cohort = 'Cohort is required.';
    if (!formData.first_name.trim()) errors.first_name = 'First name is required.';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required.';

    return errors;
}

interface CreatedLearnerState {
    cohortId: number;
    cohortName: string;
    learnerName: string;
}

function parsePositiveId(value: string | null): number | null {
    const parsed = Number(value ?? '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function NewStudentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeOrg, activeRole, capabilities } = useAuth();
    const requestedCohortId = parsePositiveId(searchParams.get('cohort'));
    const requestedCohortSubjectId = parsePositiveId(searchParams.get('cohort_subject'));
    const selfManagedTeachingWorkspace = isSelfManagedTeachingWorkspace({
        orgType: activeOrg?.org_type,
        capabilities,
    });
    const returnAfterCreate = getLearnerCreateReturnTo({
        returnTo: searchParams.get('returnTo'),
        cohortId: requestedCohortId,
        isSelfManagedTeachingWorkspace: selfManagedTeachingWorkspace,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<LearnerCreateField>>({});
    const [createdLearner, setCreatedLearner] = useState<CreatedLearnerState | null>(null);

    const { cohorts } = useCohorts();

    const [formData, setFormData] = useState({
        ...INITIAL_FORM_DATA,
        cohort: requestedCohortId ? String(requestedCohortId) : '',
    });
    const selectedCohortId = formData.cohort ? Number(formData.cohort) : null;
    const selectedCohort = useMemo(
        () => cohorts.find((cohort) => cohort.id === selectedCohortId) ?? null,
        [cohorts, selectedCohortId]
    );
    const {
        summaryRef,
        setFieldRef,
        focusField,
        focusFirstError,
    } = useFormValidationFeedback<LearnerCreateField>({
        fieldErrors,
        fieldOrder: LEARNER_FIELD_ORDER,
        fieldLabels: LEARNER_FIELD_LABELS,
        summaryId: 'learner-create-validation-summary',
    });
    const { cohort: createdCohort, loading: createdCohortLoading } = useCohortDetail(createdLearner?.cohortId ?? null);
    const quickActionSubjects = createdCohort?.subjects ?? [];

    const setFormField = (field: LearnerCreateField, value: string) => {
        setFormData((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => {
            const next = { ...current };
            delete next[field];
            return next;
        });
        if (error?.fieldErrors?.[field]) {
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const validationErrors = validateLearnerCreateForm(formData);
        setFieldErrors(validationErrors);
        if (hasFormFieldErrors(validationErrors)) {
            focusFirstError(validationErrors);
            return;
        }
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

            if (requestedCohortSubjectId) {
                await bulkEnrollCohortSubjectLearners(
                    requestedCohortSubjectId,
                    [createdStudent.id],
                );
            }

            if (returnAfterCreate) {
                router.push(returnAfterCreate);
                return;
            }

            setCreatedLearner({
                cohortId: studentData.cohort,
                cohortName: selectedCohort?.name ?? `Cohort #${studentData.cohort}`,
                learnerName,
            });
        } catch (error) {
            const resolvedError = resolveLearnerError(error, {
                action: 'create',
                entityLabel: 'learner record',
                role: activeRole,
                workspaceBehavior: capabilities.workspace_behavior,
                capabilities,
            });
            setError(resolvedError);
            if (resolvedError.fieldErrors) {
                const backendFieldErrors = normalizeFormFieldErrors(resolvedError.fieldErrors) as FormFieldErrors<LearnerCreateField>;
                setFieldErrors(backendFieldErrors);
                focusFirstError(backendFieldErrors);
            }
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
                                    setError(null);
                                    setFieldErrors({});
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
                    <div className="mb-6">
                        <AppErrorBanner error={error} onDismiss={() => setError(null)} />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div ref={summaryRef}>
                        <FormValidationSummary
                            id="learner-create-validation-summary"
                            title="Some fields need correction."
                            fieldErrors={fieldErrors}
                            fieldLabels={LEARNER_FIELD_LABELS}
                            onFieldClick={focusField}
                        />
                    </div>

                    {/* Personal Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                ref={setFieldRef('admission_number')}
                                label="Admission Number"
                                required
                                value={formData.admission_number}
                                onChange={(e) => setFormField('admission_number', e.target.value)}
                                placeholder="2025001"
                                error={getFormFieldErrorMessage(fieldErrors.admission_number)}
                            />
                            <Select
                                ref={setFieldRef('cohort')}
                                label="Cohort"
                                required
                                value={formData.cohort}
                                onChange={(e) => setFormField('cohort', e.target.value)}
                                error={getFormFieldErrorMessage(fieldErrors.cohort)}
                                options={[
                                    { value: '', label: 'Select cohort...' },
                                    ...cohorts.map(c => ({ value: c.id, label: c.name }))
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Input
                            ref={setFieldRef('first_name')}
                            label="First Name"
                            required
                            value={formData.first_name}
                            onChange={(e) => setFormField('first_name', e.target.value)}
                            placeholder="John"
                            error={getFormFieldErrorMessage(fieldErrors.first_name)}
                        />
                        <Input
                            ref={setFieldRef('middle_name')}
                            label="Middle Name"
                            value={formData.middle_name}
                            onChange={(e) => setFormField('middle_name', e.target.value)}
                            placeholder="Kamau"
                            error={getFormFieldErrorMessage(fieldErrors.middle_name)}
                            optional
                        />
                        <Input
                            ref={setFieldRef('last_name')}
                            label="Last Name"
                            required
                            value={formData.last_name}
                            onChange={(e) => setFormField('last_name', e.target.value)}
                            placeholder="Mwangi"
                            error={getFormFieldErrorMessage(fieldErrors.last_name)}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            ref={setFieldRef('date_of_birth')}
                            label="Date of Birth"
                            type="date"
                            value={formData.date_of_birth}
                            onChange={(e) => setFormField('date_of_birth', e.target.value)}
                            error={getFormFieldErrorMessage(fieldErrors.date_of_birth)}
                            optional
                        />
                        <Select
                            ref={setFieldRef('gender')}
                            label="Gender"
                            value={formData.gender}
                            onChange={(e) => setFormField('gender', e.target.value)}
                            optional
                            error={getFormFieldErrorMessage(fieldErrors.gender)}
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
                                ref={setFieldRef('email')}
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormField('email', e.target.value)}
                                placeholder="john.mwangi@student.school.com"
                                error={getFormFieldErrorMessage(fieldErrors.email)}
                                optional
                            />
                            <Input
                                ref={setFieldRef('phone')}
                                label="Phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormField('phone', e.target.value)}
                                placeholder="+254712345678"
                                error={getFormFieldErrorMessage(fieldErrors.phone)}
                                optional
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

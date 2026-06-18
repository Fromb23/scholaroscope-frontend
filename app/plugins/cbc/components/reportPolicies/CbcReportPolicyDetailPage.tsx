'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Edit } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAuth } from '@/app/context/AuthContext';
import { isAdminOrAbove } from '@/app/utils/permissions';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useCohortSubjectsByCohorts } from '@/app/core/hooks/useCohortSubjects';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCBCCatalog } from '@/app/plugins/cbc/hooks/useCBC';
import { useCbcReportPolicy } from '@/app/plugins/cbc/hooks/useCbcReportPolicies';
import { CbcReportPolicyFormModal } from '@/app/plugins/cbc/components/reportPolicies/CbcReportPolicyFormModal';
import {
    buildCbcCohortSubjectOptions,
    buildCbcSubjectProfileOptions,
} from '@/app/plugins/cbc/components/reportPolicies/policyScopeOptions';
import { PolicyAdminOnlyState } from '@/app/core/components/reports/PolicyAdminOnlyState';

export function CbcReportPolicyDetailPage() {
    const params = useParams();
    const policyId = Number(params.id);
    const { user, activeRole, loading: authLoading } = useAuth();
    const canManagePolicies = isAdminOrAbove(user, activeRole);
    const [showEditModal, setShowEditModal] = useState(false);

    const { policy, loading, error, refetch } = useCbcReportPolicy(
        Number.isFinite(policyId) ? policyId : null,
        { enabled: canManagePolicies && !authLoading },
    );
    const { cohorts } = useCohorts();
    const cohortIds = useMemo(() => cohorts.map((cohort) => cohort.id), [cohorts]);
    const { subjects: cohortSubjects } = useCohortSubjectsByCohorts(cohortIds);
    const { terms } = useTerms();
    const { data: catalog } = useCBCCatalog();

    const subjectProfileOptions = useMemo(
        () => buildCbcSubjectProfileOptions(catalog),
        [catalog],
    );
    const cohortSubjectOptions = useMemo(
        () => buildCbcCohortSubjectOptions(cohortSubjects),
        [cohortSubjects],
    );
    const termOptions = useMemo(
        () => terms.map((term) => ({
            id: term.id,
            label: `${term.academic_year_name} · ${term.name}`,
        })),
        [terms],
    );

    if (authLoading) {
        return <LoadingSpinner />;
    }

    if (!canManagePolicies) {
        return <PolicyAdminOnlyState title="CBC Report Policies" />;
    }

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error || !policy) {
        return (
            <ErrorBanner
                message={error instanceof Error ? error.message : 'CBC report policy not found.'}
                onDismiss={() => {}}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                    <Link href="/cbc/report-policies">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to CBC Report Policies
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">{policy.name}</h1>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="green">CBC plugin-owned</Badge>
                            {policy.is_default && <Badge variant="orange">Default</Badge>}
                            <Badge variant={policy.is_active ? 'green' : 'red'}>
                                {policy.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    {policy.description && <p className="max-w-3xl text-sm text-gray-600">{policy.description}</p>}
                </div>
                {canManagePolicies && (
                    <Button onClick={() => setShowEditModal(true)}>
                        <Edit className="mr-1.5 h-4 w-4" />
                        Edit CBC Report Policy
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900">Scope</h2>
                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                        <p><span className="font-medium text-gray-900">Subject Profile:</span> {policy.subject_profile_name ?? 'Any'}</p>
                        <p><span className="font-medium text-gray-900">CBC Cohort Subject:</span> {policy.cbc_cohort_subject_name ?? 'Any'}</p>
                        <p><span className="font-medium text-gray-900">Term:</span> {policy.term_name ?? 'Any'}</p>
                        <p><span className="font-medium text-gray-900">Rounding Mode:</span> {policy.rounding_mode}</p>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-lg font-semibold text-gray-900">Effective Components</h2>
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500">Assessment type</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500">Weight</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500">Contributes</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500">Required if eligible</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-500">Diagnostic</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {Object.entries(policy.assessment_weights).map(([type, weight]) => (
                                    <tr key={type}>
                                        <td className="px-3 py-2 font-medium text-gray-900">{type}</td>
                                        <td className="px-3 py-2">{weight}%</td>
                                        <td className="px-3 py-2">{weight > 0 ? 'Yes' : 'No'}</td>
                                        <td className="px-3 py-2">{policy.required_components.includes(type) ? 'Yes' : 'No'}</td>
                                        <td className="px-3 py-2">{policy.diagnostic_assessment_types.includes(type) ? 'Yes' : 'No'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900">Optional Evidence Sources</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant={policy.include_assignments ? 'green' : 'default'}>Assignments {policy.include_assignments ? 'enabled' : 'disabled'}</Badge>
                        <Badge variant={policy.include_projects ? 'green' : 'default'}>Projects {policy.include_projects ? 'enabled' : 'disabled'}</Badge>
                        <Badge variant={policy.include_practicals ? 'green' : 'default'}>Practicals {policy.include_practicals ? 'enabled' : 'disabled'}</Badge>
                    </div>
                </Card>
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900">Late-Enrolment Rules</h2>
                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                        <p><span className="font-medium text-gray-900">Pre-enrolment components:</span> {policy.late_enrolment?.pre_enrolment_component_handling ?? 'EXEMPT'}</p>
                        <p><span className="font-medium text-gray-900">Final point rule:</span> {policy.late_enrolment?.award_final_point_only_when_evidence_sufficient !== false ? 'Only when evidence is sufficient' : 'Policy override allowed'}</p>
                        <p><span className="font-medium text-gray-900">Single broad evidence event:</span> {policy.late_enrolment?.allow_single_broad_evidence_event ? 'Allowed' : 'Not allowed by default'}</p>
                        <p><span className="font-medium text-gray-900">Teacher override reason:</span> {policy.late_enrolment?.teacher_override_requires_reason !== false ? 'Required' : 'Not required'}</p>
                    </div>
                </Card>
            </div>

            <Card>
                <h2 className="text-lg font-semibold text-gray-900">CBC Level Scale</h2>
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Min</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Max</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Performance Level</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Actual Level</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Label</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {policy.level_scale.map((row) => (
                                <tr key={row.code}>
                                    <td className="px-4 py-3">{row.min}</td>
                                    <td className="px-4 py-3">{row.max}</td>
                                    <td className="px-4 py-3">{row.level}</td>
                                    <td className="px-4 py-3">{row.code}</td>
                                    <td className="px-4 py-3">{row.label}</td>
                                    <td className="px-4 py-3">{row.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showEditModal && (
                <CbcReportPolicyFormModal
                    editingPolicy={policy}
                    subjectProfiles={subjectProfileOptions}
                    cohortSubjects={cohortSubjectOptions}
                    terms={termOptions}
                    onSuccess={async () => {
                        await refetch();
                        setShowEditModal(false);
                    }}
                    onClose={() => setShowEditModal(false)}
                />
            )}
        </div>
    );
}

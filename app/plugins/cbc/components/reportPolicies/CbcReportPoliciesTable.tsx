'use client';

import Link from 'next/link';
import { CheckCircle, Edit, Eye, Plus, Trash2, XCircle } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import type { CbcReportPolicy, PolicyAuthoringMode } from '@/app/plugins/cbc/types/reportPolicy';
import { buildCbcPolicyRuleSummary } from '@/app/plugins/cbc/components/reportPolicies/policySummaries';

type ScopeBadgeVariant = 'blue' | 'green' | 'indigo' | 'orange' | 'purple' | 'default';

export function getCbcReportPolicyScopeBadges(policy: CbcReportPolicy): Array<{
    label: string;
    variant: ScopeBadgeVariant;
}> {
    const badges: Array<{ label: string; variant: ScopeBadgeVariant }> = [];

    if (policy.cbc_cohort_subject_name) {
        badges.push({
            label: `Class subject policy: ${policy.cbc_cohort_subject_name}`,
            variant: 'green',
        });
    } else if (policy.cohort_name) {
        badges.push({
            label: `Class policy: ${policy.cohort_name}`,
            variant: 'blue',
        });
    } else if (policy.subject_profile_name) {
        badges.push({
            label: `Catalog fallback: ${policy.subject_profile_name} (Reference only)`,
            variant: 'purple',
        });
    }

    if (policy.is_default) {
        badges.push({
            label: 'Workspace default policy',
            variant: 'orange',
        });
    }

    if (policy.term_name) {
        badges.push({
            label: `Term: ${policy.term_name}`,
            variant: 'indigo',
        });
    }

    if (badges.length === 0) {
        badges.push({
            label: 'Workspace policy',
            variant: 'default',
        });
    }

    return badges;
}

interface CbcReportPoliciesTableProps {
    policies: CbcReportPolicy[];
    canManage: boolean;
    authoringMode?: PolicyAuthoringMode;
    deletingId: number | null;
    onCreate: () => void;
    onEdit: (policy: CbcReportPolicy) => void;
    onActivate?: (policy: CbcReportPolicy) => void;
    onCreateActiveCopy?: (policy: CbcReportPolicy) => void;
    onDelete: (id: number) => void;
}

export function CbcReportPoliciesTable({
    policies,
    canManage,
    authoringMode = 'INSTITUTION_GOVERNANCE',
    deletingId,
    onCreate,
    onEdit,
    onActivate,
    onCreateActiveCopy,
    onDelete,
}: CbcReportPoliciesTableProps) {
    const showGlobalViewAction = authoringMode === 'INSTITUTION_GOVERNANCE';

    return (
        <Card>
            {policies.length === 0 ? (
                <div className="py-16 text-center">
                    <p className="text-sm font-medium text-gray-900">No CBC report policies yet</p>
                    <p className="mt-1 text-sm text-gray-500">
                        Create a CBC report policy to define performance level interpretation.
                    </p>
                    {canManage && (
                        <Button className="mt-4" onClick={onCreate}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            New CBC Report Policy
                        </Button>
                    )}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Policy</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Assessment Weights</TableHead>
                            <TableHead>CBC Level Scale</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {policies.map((policy) => {
                            const scopeBadges = getCbcReportPolicyScopeBadges(policy);

                            return (
                                <TableRow key={policy.id}>
                                    <TableCell>
                                        <p className="font-medium text-gray-900">{policy.name}</p>
                                        {policy.description && (
                                            <p className="mt-0.5 text-xs text-gray-500">{policy.description}</p>
                                        )}
                                        <div className="mt-2 text-xs text-gray-500">
                                            {buildCbcPolicyRuleSummary(policy).slice(0, 3).map((line) => (
                                                <p key={line}>{line}</p>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {scopeBadges.map((badge) => (
                                                <Badge key={badge.label} variant={badge.variant}>
                                                    {badge.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(policy.assessment_weights).map(([type, weight]) => (
                                                <Badge key={type} variant="blue">{type} {weight}%</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="green">{policy.level_scale.length} rows</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {policy.is_active ? (
                                            <Badge variant="green">
                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="red">
                                                <XCircle className="mr-1 h-3 w-3" />
                                                Inactive
                                            </Badge>
                                        )}
                                        {!policy.is_active && (
                                            <p className="mt-2 max-w-xs text-xs text-red-700">
                                                This policy is inactive. It is saved but will not be used in report computation.
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {showGlobalViewAction && (
                                                <Link href={`/cbc/report-policies/${policy.id}`}>
                                                    <Button size="sm" variant="ghost">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {canManage && (
                                                <>
                                                    {!policy.is_active && onActivate ? (
                                                        <Button size="sm" variant="secondary" onClick={() => onActivate(policy)}>
                                                            Activate policy
                                                        </Button>
                                                    ) : null}
                                                    {!policy.is_active && onCreateActiveCopy ? (
                                                        <Button size="sm" variant="secondary" onClick={() => onCreateActiveCopy(policy)}>
                                                            Create active copy
                                                        </Button>
                                                    ) : null}
                                                    <Button size="sm" variant="ghost" onClick={() => onEdit(policy)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onDelete(policy.id)}
                                                        disabled={deletingId === policy.id}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </Card>
    );
}

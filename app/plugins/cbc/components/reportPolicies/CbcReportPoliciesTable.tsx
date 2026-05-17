'use client';

import Link from 'next/link';
import { CheckCircle, Edit, Eye, Plus, Trash2, XCircle } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import type { CbcReportPolicy } from '@/app/plugins/cbc/types/reportPolicy';

interface CbcReportPoliciesTableProps {
    policies: CbcReportPolicy[];
    canManage: boolean;
    deletingId: number | null;
    onCreate: () => void;
    onEdit: (policy: CbcReportPolicy) => void;
    onDelete: (id: number) => void;
}

export function CbcReportPoliciesTable({
    policies,
    canManage,
    deletingId,
    onCreate,
    onEdit,
    onDelete,
}: CbcReportPoliciesTableProps) {
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
                        {policies.map((policy) => (
                            <TableRow key={policy.id}>
                                <TableCell>
                                    <p className="font-medium text-gray-900">{policy.name}</p>
                                    {policy.description && (
                                        <p className="mt-0.5 text-xs text-gray-500">{policy.description}</p>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {policy.cbc_cohort_subject_name && (
                                            <Badge variant="green">{policy.cbc_cohort_subject_name}</Badge>
                                        )}
                                        {policy.subject_profile_name && (
                                            <Badge variant="purple">{policy.subject_profile_name}</Badge>
                                        )}
                                        {policy.term_name && <Badge variant="indigo">{policy.term_name}</Badge>}
                                        {policy.is_default && <Badge variant="orange">Default</Badge>}
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
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Link href={`/cbc/report-policies/${policy.id}`}>
                                            <Button size="sm" variant="ghost">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        {canManage && (
                                            <>
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
                        ))}
                    </TableBody>
                </Table>
            )}
        </Card>
    );
}

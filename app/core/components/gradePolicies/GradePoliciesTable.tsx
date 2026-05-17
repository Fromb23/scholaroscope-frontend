'use client';

import { CheckCircle, Edit, Plus, Settings, Trash2, XCircle } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import type { GradePolicy } from '@/app/core/types/gradePolicy';

const METHOD_LABELS: Record<string, string> = {
    WEIGHTED: 'Weighted Average',
    AVERAGE_PLUS_EXAM: 'Avg CATs + Exam',
    PAPERS_AVERAGE: 'Papers Average',
    DROP_LOWEST: 'Drop Lowest CAT',
    EXAM_ONLY: 'Exam Only',
};

interface GradePoliciesTableProps {
    policies: GradePolicy[];
    deletingId: number | null;
    canManage?: boolean;
    onCreate: () => void;
    onEdit: (policy: GradePolicy) => void;
    onDelete: (id: number) => void;
}

export function GradePoliciesTable({
    policies,
    deletingId,
    canManage = true,
    onCreate,
    onEdit,
    onDelete,
}: GradePoliciesTableProps) {
    return (
        <Card>
            {policies.length === 0 ? (
                <div className="py-16 text-center">
                    <Settings className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-3 text-sm font-medium text-gray-900">No policies yet</p>
                    <p className="mt-1 text-sm text-gray-500">
                        Create a generic policy to define grade computation rules.
                    </p>
                    {canManage && (
                        <Button className="mt-4" onClick={onCreate}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            New Generic Policy
                        </Button>
                    )}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Policy</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Scale</TableHead>
                            <TableHead>Status</TableHead>
                            {canManage && <TableHead>Actions</TableHead>}
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
                                    <Badge variant="blue">
                                        {METHOD_LABELS[policy.aggregation_method] ?? policy.aggregation_method}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {policy.cohort_subject_name && (
                                            <Badge variant="purple">{policy.cohort_subject_name}</Badge>
                                        )}
                                        {policy.cohort_name && <Badge variant="indigo">{policy.cohort_name}</Badge>}
                                        {policy.curriculum_name && (
                                            <Badge variant="default">{policy.curriculum_name}</Badge>
                                        )}
                                        {policy.is_default && <Badge variant="orange">Default</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {policy.grading_scale?.length > 0 ? (
                                        <Badge variant="green">Custom ({policy.grading_scale.length} bands)</Badge>
                                    ) : (
                                        <span className="text-xs text-gray-400">System default</span>
                                    )}
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
                                {canManage && (
                                    <TableCell>
                                        <div className="flex gap-1">
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
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Card>
    );
}

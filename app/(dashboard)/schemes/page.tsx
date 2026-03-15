'use client';

// ============================================================================
// (dashboard)/schemes/page.tsx
// Main Schemes List with Consistent UI
// ============================================================================

import { useState } from 'react';
import Link from 'next/link';
import {
    BookOpen,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    PlayCircle
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';

// Dummy data matching new structure
const dummySchemes = [
    {
        id: 1,
        cohort_subject_name: 'Form 3 East - Mathematics',
        cohort_name: 'Form 3 East',
        subject_name: 'Mathematics',
        term_name: 'Term 1 2026',
        curriculum_model: 'CBC',
        total_weeks: 13,
        teaching_weeks: 10,
        total_lessons: 30,
        completed_lessons: 12,
        completion_percentage: 40,
        status: 'ACTIVE',
        created_at: '2026-01-05'
    },
    {
        id: 2,
        cohort_subject_name: 'Form 3 East - English',
        cohort_name: 'Form 3 East',
        subject_name: 'English',
        term_name: 'Term 1 2026',
        curriculum_model: '8-4-4',
        total_weeks: 13,
        teaching_weeks: 11,
        total_lessons: 22,
        completed_lessons: 8,
        completion_percentage: 36,
        status: 'ACTIVE',
        created_at: '2026-01-05'
    },
    {
        id: 3,
        cohort_subject_name: 'Grade 7 Blue - Science',
        cohort_name: 'Grade 7 Blue',
        subject_name: 'Integrated Science',
        term_name: 'Term 1 2026',
        curriculum_model: 'CBC',
        total_weeks: 13,
        teaching_weeks: 9,
        total_lessons: 27,
        completed_lessons: 0,
        completion_percentage: 0,
        status: 'DRAFT',
        created_at: '2026-01-10'
    }
];

export default function SchemesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
            ACTIVE: 'success',
            DRAFT: 'warning',
            COMPLETED: 'info',
            ARCHIVED: 'default'
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    const filteredSchemes = dummySchemes.filter(scheme => {
        const matchesSearch = scheme.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            scheme.cohort_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || scheme.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Schemes of Work</h1>
                    <p className="text-gray-600 mt-1">Manage your term planning and lesson execution</p>
                </div>
                <Link href="/schemes/create">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Scheme
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by subject or cohort..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="DRAFT">Draft</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="ARCHIVED">Archived</option>
                    </select>
                </div>
            </Card>

            {/* Schemes Table */}
            <Card>
                {filteredSchemes.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No schemes found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchQuery || statusFilter !== 'ALL'
                                ? 'Try adjusting your filters'
                                : 'Get started by creating a new scheme'}
                        </p>
                        {!searchQuery && statusFilter === 'ALL' && (
                            <div className="mt-6">
                                <Link href="/schemes/create">
                                    <Button>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Scheme
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject & Cohort</TableHead>
                                <TableHead>Term</TableHead>
                                <TableHead>Curriculum</TableHead>
                                <TableHead>Weeks</TableHead>
                                <TableHead>Lessons</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSchemes.map((scheme) => (
                                <TableRow key={scheme.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-gray-900">{scheme.subject_name}</p>
                                            <p className="text-sm text-gray-500">{scheme.cohort_name}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {scheme.term_name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="default">{scheme.curriculum_model}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <span className="font-medium text-gray-900">{scheme.teaching_weeks}</span>
                                            <span className="text-gray-500"> / {scheme.total_weeks}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <span className="font-medium text-gray-900">{scheme.completed_lessons}</span>
                                            <span className="text-gray-500"> / {scheme.total_lessons}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${scheme.completion_percentage >= 75 ? 'bg-green-600' :
                                                            scheme.completion_percentage >= 50 ? 'bg-blue-600' :
                                                                scheme.completion_percentage >= 25 ? 'bg-yellow-600' :
                                                                    'bg-red-600'
                                                            }`}
                                                        style={{ width: `${scheme.completion_percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">
                                                {scheme.completion_percentage}%
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(scheme.status)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Link href={`/schemes/${scheme.id}`}>
                                                <Button size="sm" variant="ghost">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/schemes/${scheme.id}/edit`}>
                                                <Button size="sm" variant="ghost">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button size="sm" variant="ghost">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Schemes</p>
                            <p className="text-2xl font-bold text-gray-900">{dummySchemes.length}</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <PlayCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Active</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {dummySchemes.filter(s => s.status === 'ACTIVE').length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Draft</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {dummySchemes.filter(s => s.status === 'DRAFT').length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Avg Progress</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {Math.round(dummySchemes.reduce((acc, s) => acc + s.completion_percentage, 0) / dummySchemes.length)}%
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
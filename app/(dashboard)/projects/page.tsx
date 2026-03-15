'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderKanban, Plus, Filter, Users, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useProjects } from '@/app/plugins/projects/hooks/useProjects';
import { useTerms, useSubjects } from '@/app/core/hooks/useAcademic';
import { Project } from '@/app/plugins/projects/types/project';

export default function ProjectsOverview() {
    const router = useRouter();
    const [selectedTerm, setSelectedTerm] = useState<number | undefined>();
    const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
    const [selectedEvalType, setSelectedEvalType] = useState<string | undefined>();

    const { projects, loading } = useProjects({
        term: selectedTerm,
        subject: selectedSubject,
        evaluation_type: selectedEvalType
    });

    const { terms } = useTerms();
    const { subjects } = useSubjects();

    const evaluationTypes = [
        { value: '', label: 'All Evaluation Types' },
        { value: 'NUMERIC', label: 'Numeric' },
        { value: 'RUBRIC', label: 'Rubric' },
        { value: 'DESCRIPTIVE', label: 'Descriptive' }
    ];

    const getProjectStatus = (project: Project) => {
        const now = new Date();
        const start = project.start_date ? new Date(project.start_date) : null;
        const end = project.end_date ? new Date(project.end_date) : null;

        if (start && end) {
            if (now < start) return { label: 'Upcoming', color: 'blue' as const };
            if (now >= start && now <= end) return { label: 'Active', color: 'green' as const };
            if (now > end) return { label: 'Completed', color: 'default' as const };
        }
        return { label: 'Not Scheduled', color: 'yellow' as const };
    };

    // Calculate statistics
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => {
        const status = getProjectStatus(p);
        return status.label === 'Active';
    }).length;
    const completedProjects = projects.filter(p => {
        const status = getProjectStatus(p);
        return status.label === 'Completed';
    }).length;
    const totalParticipants = projects.reduce((sum, p) => sum + p.participants_count, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
                    <p className="text-gray-600 mt-1">Manage project-based learning activities</p>
                </div>
                <Link href="/projects/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Project
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Projects"
                    value={totalProjects}
                    icon={FolderKanban}
                    color="blue"
                />
                <StatsCard
                    title="Active Projects"
                    value={activeProjects}
                    icon={Clock}
                    color="green"
                />
                <StatsCard
                    title="Completed"
                    value={completedProjects}
                    icon={CheckCircle2}
                    color="purple"
                />
                <StatsCard
                    title="Total Participants"
                    value={totalParticipants}
                    icon={Users}
                    color="orange"
                />
            </div>

            {/* Filters */}
            <Card>
                <div className="p-4">
                    <div className="flex items-center gap-4">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                            <Select
                                label=""
                                value={selectedTerm?.toString() || ''}
                                onChange={(e) => setSelectedTerm(e.target.value ? Number(e.target.value) : undefined)} options={[]}                            >
                                <option value="">All Terms</option>
                                {terms.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </Select>

                            <Select
                                label=""
                                value={selectedSubject?.toString() || ''}
                                onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : undefined)} options={[]}                            >
                                <option value="">All Subjects</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </Select>

                            <Select
                                label=""
                                value={selectedEvalType || ''}
                                onChange={(e) => setSelectedEvalType(e.target.value || undefined)} options={[]}                            >
                                {evaluationTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Projects Table */}
            <Card>
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading projects...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="py-12 text-center">
                        <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {selectedTerm || selectedSubject || selectedEvalType
                                ? 'Try adjusting your filters'
                                : 'Get started by creating a new project'}
                        </p>
                        {!selectedTerm && !selectedSubject && !selectedEvalType && (
                            <Link href="/projects/new">
                                <Button className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Project
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Project Name</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Participants</TableHead>
                                <TableHead>Milestones</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projects.map((project) => {
                                const status = getProjectStatus(project);
                                return (
                                    <TableRow
                                        key={project.id}
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                    >
                                        <TableCell>
                                            <div>
                                                <div className="font-medium text-gray-900">{project.name}</div>
                                                {project.term_name && (
                                                    <div className="text-sm text-gray-500">{project.term_name}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium text-gray-900">{project.subject_name}</div>
                                                <div className="text-sm text-gray-500">{project.subject_code}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {project.start_date && project.end_date ? (
                                                <div className="text-sm text-gray-600">
                                                    <div>{new Date(project.start_date).toLocaleDateString()}</div>
                                                    <div className="text-xs text-gray-500">
                                                        to {new Date(project.end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-500">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="purple">{project.participants_count}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="blue">{project.milestones_count}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={status.color}>{status.label}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/projects/${project.id}`);
                                                }}
                                            >
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Pagination info */}
            {projects.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing <span className="font-medium">{projects.length}</span> projects
                    </p>
                </div>
            )}
        </div>
    );
}
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Calendar,
    BookOpen,
    Users,
    GraduationCap,
    Clock,
    TrendingUp
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useAcademicYears, useCurricula, useCohorts, useTerms } from '@/app/core/hooks/useAcademic';
import { Badge } from '@/app/components/ui/Badge';
import { DesktopOnly } from '@/app/core/components/DesktopOnly';

export default function AcademicOverview() {
    const { academicYears, loading: yearsLoading } = useAcademicYears();
    const { curricula, loading: curriculaLoading } = useCurricula();
    const { cohorts, loading: cohortsLoading } = useCohorts();
    const { terms, loading: termsLoading } = useTerms();

    const currentYear = academicYears.find(y => y.is_current);
    const activeCurricula = curricula.filter(c => c.is_active);

    const loading = yearsLoading || curriculaLoading || cohortsLoading || termsLoading;

    const quickLinks = [
        {
            title: 'Academic Years',
            description: 'Manage academic year settings',
            href: '/academic/years',
            icon: Calendar,
            count: academicYears.length,
            color: 'blue'
        },
        {
            title: 'Terms',
            description: 'Configure term schedules',
            href: '/academic/terms',
            icon: Clock,
            count: terms.length,
            color: 'green'
        },
        {
            title: 'Curricula',
            description: 'Manage curriculum frameworks',
            href: '/academic/curricula',
            icon: BookOpen,
            count: activeCurricula.length,
            color: 'purple'
        },
        {
            title: 'Subjects',
            description: 'Configure subjects and courses',
            href: '/academic/subjects',
            icon: GraduationCap,
            count: curricula.reduce((sum, c) => sum + c.subjects_count, 0),
            color: 'orange'
        },
        {
            title: 'Cohorts',
            description: 'Manage student cohorts',
            href: '/academic/cohorts',
            icon: Users,
            count: cohorts.length,
            color: 'indigo'
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading academic data...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Academic Management</h1>
                    <p className="text-gray-600 mt-1">
                        Configure academic years, terms, curricula, and cohorts
                    </p>
                </div>
            </div>

            {/* Current Academic Context */}
            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Current Academic Context
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <div className="text-sm text-gray-600 mb-1">Academic Year</div>
                            {currentYear ? (
                                <div>
                                    <div className="text-lg font-semibold text-gray-900">
                                        {currentYear.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {new Date(currentYear.start_date).toLocaleDateString()} - {' '}
                                        {new Date(currentYear.end_date).toLocaleDateString()}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400">No current year set</div>
                            )}
                        </div>

                        <div>
                            <div className="text-sm text-gray-600 mb-1">Active Curricula</div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {activeCurricula.length > 0 ? (
                                    activeCurricula.map(c => (
                                        <Badge key={c.id} variant="blue">
                                            {c.curriculum_type_display}
                                        </Badge>
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-400">No active curricula</div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-600 mb-1">Current Cohorts</div>
                            <div className="text-lg font-semibold text-gray-900">
                                {cohorts.length}
                            </div>
                            <div className="text-sm text-gray-500">
                                {cohorts.reduce((sum, c) => sum + c.students_count, 0)} total students
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Stats Overview */}
            <DesktopOnly>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Academic Years"
                        value={academicYears.length}
                        icon={Calendar}
                        trend={{ value: 0, isPositive: true }}
                        color="blue"
                    />
                    <StatsCard
                        title="Active Terms"
                        value={terms.length}
                        icon={Clock}
                        trend={{ value: 0, isPositive: true }}
                        color="green"
                    />
                    <StatsCard
                        title="Curricula"
                        value={activeCurricula.length}
                        icon={BookOpen}
                        trend={{ value: 0, isPositive: true }}
                        color="purple"
                    />
                    <StatsCard
                        title="Total Cohorts"
                        value={cohorts.length}
                        icon={Users}
                        trend={{ value: 0, isPositive: true }}
                        color="indigo"
                    />
                </div>
            </DesktopOnly>

            {/* Quick Links */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Academic Sections
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quickLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link key={link.href} href={link.href}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 bg-${link.color}-100 rounded-lg`}>
                                                <Icon className={`w-6 h-6 text-${link.color}-600`} />
                                            </div>
                                            <Badge variant={link.color as any}>
                                                {link.count}
                                            </Badge>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {link.title}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {link.description}
                                        </p>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Recent Activity */}
            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Recent Updates
                    </h2>
                    <div className="space-y-3">
                        {academicYears.slice(0, 5).map(year => (
                            <div key={year.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <div className="font-medium text-gray-900">{year.name}</div>
                                        <div className="text-sm text-gray-500">
                                            {year.cohorts_count} cohorts • {year.terms_count} terms
                                        </div>
                                    </div>
                                </div>
                                {year.is_current && (
                                    <Badge variant="green">Current</Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}
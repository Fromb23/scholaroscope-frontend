'use client';

import Link from 'next/link';
import { ArrowRight, Award, BookOpen, Puzzle } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import {
    getAvailablePolicySurfaces,
    type PolicySurfaceDefinition,
} from '@/app/core/lib/policySurfaces';

function SurfaceIcon({ surface }: { surface: PolicySurfaceDefinition }) {
    if (surface.key === 'cbc') {
        return <Puzzle className="h-5 w-5 text-green-600" />;
    }

    if (surface.key === 'cambridge') {
        return <BookOpen className="h-5 w-5 text-purple-600" />;
    }

    return <Award className="h-5 w-5 text-blue-600" />;
}

export function ReportPoliciesHubPage() {
    const { curricula, loading: curriculaLoading, error: curriculaError } = useCurricula();
    const { plugins, loading: pluginsLoading, error: pluginsError } = usePlugins();

    const surfaces = getAvailablePolicySurfaces({
        curricula,
        installedPlugins: plugins,
    });

    if (curriculaLoading || pluginsLoading) {
        return <LoadingSpinner />;
    }

    if (curriculaError || pluginsError) {
        return (
            <ErrorBanner
                message={curriculaError ?? pluginsError ?? 'Failed to load policy modules.'}
                onDismiss={() => {}}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Report Policies</h1>
                    <p className="mt-1 text-gray-500">
                        Policy authoring stays inside the reporting module that owns the curriculum workflow.
                    </p>
                </div>
                <Award className="h-7 w-7 text-blue-600" />
            </div>

            {surfaces.length === 0 ? (
                <Card className="max-w-3xl">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-gray-400" />
                            <h2 className="text-lg font-semibold text-gray-900">
                                No report policy module is available for this organization yet.
                            </h2>
                        </div>
                        <p className="text-sm text-gray-600">
                            Report policy tools only appear when the organization has an active curriculum or plugin
                            with a supported reporting surface.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {surfaces.map((surface) => (
                        <Link key={surface.key} href={surface.href} className="group">
                            <Card className="h-full transition-shadow hover:shadow-md">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-gray-50 p-2">
                                                <SurfaceIcon surface={surface} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                                                    {surface.label}
                                                </h2>
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    <Badge variant={surface.owner === 'kernel' ? 'blue' : 'green'}>
                                                        {surface.owner === 'kernel' ? 'Kernel-owned' : 'Plugin-owned'}
                                                    </Badge>
                                                    {surface.pluginKey && (
                                                        <Badge variant="default">{surface.pluginKey}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm leading-6 text-gray-600">
                                            {surface.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

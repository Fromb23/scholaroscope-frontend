'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Download, Eye, Plus } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { useSchemes } from '@/app/core/hooks/useSchemes';
import type { SchemeOfWork } from '@/app/core/types/schemes';
import { formatTimestamp } from '@/app/plugins/schemes/lib/workflow';

function getStatusVariant(scheme: SchemeOfWork): 'success' | 'warning' | 'default' {
    if (scheme.is_historical) {
        return 'warning';
    }

    if (scheme.status === 'GENERATED') {
        return 'success';
    }

    return 'default';
}

function normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
}

function matchesSearch(scheme: SchemeOfWork, search: string): boolean {
    const normalizedSearch = normalizeText(search);
    if (!normalizedSearch) {
        return true;
    }

    return [
        scheme.title,
        scheme.subject_name,
        scheme.level_label,
        scheme.teacher_name,
        scheme.term_name,
        scheme.cohort_name,
        scheme.curriculum_name,
    ].some((value) => normalizeText(value).includes(normalizedSearch));
}

function SectionHeading({
    title,
    description,
}: {
    title: string;
    description?: string;
}) {
    return (
        <div>
            <h2 className="text-lg font-semibold theme-text">{title}</h2>
            {description ? (
                <p className="mt-1 text-sm theme-subtle">{description}</p>
            ) : null}
        </div>
    );
}

function SchemeCard({
    scheme,
    downloading,
    onDownload,
    onOpen,
}: {
    scheme: SchemeOfWork;
    downloading: boolean;
    onDownload: () => void;
    onOpen: () => void;
}) {
    return (
        <Card className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold theme-text">
                            {scheme.subject_name}
                        </h3>
                        <Badge variant={getStatusVariant(scheme)}>
                            {scheme.status_display}
                        </Badge>
                        {scheme.is_historical ? (
                            <Badge variant="warning">Historical record</Badge>
                        ) : null}
                    </div>
                    <p className="mt-1 text-sm theme-subtle">{scheme.title}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onDownload}
                        disabled={downloading}
                    >
                        <Download className="h-4 w-4" />
                        Download Scheme
                    </Button>
                    <Button type="button" size="sm" onClick={onOpen}>
                        <Eye className="h-4 w-4" />
                        {scheme.is_historical ? 'Open' : 'Open/Edit'}
                    </Button>
                </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Level / Grade
                    </dt>
                    <dd className="mt-1 text-sm theme-text">{scheme.level_label || 'Not set'}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Term
                    </dt>
                    <dd className="mt-1 text-sm theme-text">{scheme.term_name}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Teacher
                    </dt>
                    <dd className="mt-1 text-sm theme-text">{scheme.teacher_name}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Last updated
                    </dt>
                    <dd className="mt-1 text-sm theme-text">{formatTimestamp(scheme.updated_at)}</dd>
                </div>
            </dl>
        </Card>
    );
}

export function SchemesPage() {
    const router = useRouter();
    const { schemes, loading, error, downloadScheme } = useSchemes();
    const { curricula } = useCurricula();
    const [search, setSearch] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const filteredSchemes = useMemo(
        () => schemes.filter((scheme) => matchesSearch(scheme, search)),
        [schemes, search],
    );

    const multipleActiveCurricula = useMemo(() => {
        const activeCount = curricula.filter((curriculum) => curriculum.is_active).length;
        if (activeCount > 1) {
            return true;
        }

        return new Set(
            filteredSchemes.map((scheme) => normalizeText(scheme.curriculum_name)),
        ).size > 1;
    }, [curricula, filteredSchemes]);

    const groupedSchemes = useMemo(() => {
        const groups = new Map<string, Map<string, SchemeOfWork[]>>();

        filteredSchemes.forEach((scheme) => {
            const outerKey = multipleActiveCurricula
                ? scheme.curriculum_name || 'Unlabelled curriculum'
                : scheme.subject_name || 'Unlabelled subject';
            const innerKey = multipleActiveCurricula
                ? `${scheme.subject_name || 'Unlabelled subject'}:::${scheme.level_label || 'Unlabelled level'}`
                : scheme.level_label || 'Unlabelled level';

            if (!groups.has(outerKey)) {
                groups.set(outerKey, new Map<string, SchemeOfWork[]>());
            }

            const innerGroup = groups.get(outerKey);
            if (!innerGroup) {
                return;
            }

            const current = innerGroup.get(innerKey) ?? [];
            current.push(scheme);
            innerGroup.set(innerKey, current);
        });

        return Array.from(groups.entries());
    }, [filteredSchemes, multipleActiveCurricula]);

    const handleDownload = async (schemeId: number) => {
        try {
            setActionError(null);
            setDownloadingId(schemeId);
            await downloadScheme(schemeId);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not download the scheme of work.');
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) {
        return <LoadingSpinner message="Loading schemes of work..." fullScreen={false} />;
    }

    if (error) {
        return (
            <ErrorState
                message={error}
                fullScreen={false}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold theme-text">Schemes of Work</h1>
                    <p className="mt-1 text-sm theme-subtle">
                        Create draft schemes, review term coverage, and download the server export.
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search schemes"
                        className="min-w-[240px]"
                    />
                    <Link href="/schemes/new">
                        <Button type="button">
                            <Plus className="h-4 w-4" />
                            Create Draft Scheme
                        </Button>
                    </Link>
                </div>
            </div>

            {actionError ? (
                <ErrorBanner
                    title="Download failed"
                    message={actionError}
                    onDismiss={() => setActionError(null)}
                />
            ) : null}

            {filteredSchemes.length === 0 ? (
                <Card className="space-y-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                        <BookOpen className="h-7 w-7" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold theme-text">No schemes created yet</h2>
                        <p className="mt-1 text-sm theme-subtle">
                            Create a draft scheme from your term plan.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        <Link href="/schemes/new">
                            <Button type="button">
                                <Plus className="h-4 w-4" />
                                Create Draft Scheme
                            </Button>
                        </Link>
                    </div>
                </Card>
            ) : null}

            {groupedSchemes.map(([outerLabel, groups]) => (
                <section key={outerLabel} className="space-y-4">
                    <SectionHeading
                        title={outerLabel}
                        description={
                            multipleActiveCurricula
                                ? 'Curriculum grouping'
                                : 'Subject grouping'
                        }
                    />

                    {Array.from(groups.entries()).map(([innerLabel, schemesInGroup]) => {
                        const title = multipleActiveCurricula
                            ? innerLabel.split(':::')[0]
                            : innerLabel;
                        const description = multipleActiveCurricula
                            ? innerLabel.split(':::')[1]
                            : `${schemesInGroup[0]?.subject_name ?? ''}`;

                        return (
                            <div key={`${outerLabel}-${innerLabel}`} className="space-y-3">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-base font-semibold theme-text">{title}</h3>
                                    <p className="text-sm theme-subtle">
                                        {multipleActiveCurricula ? description : `Level / Grade`}
                                    </p>
                                </div>

                                <div className="grid gap-4 xl:grid-cols-2">
                                    {schemesInGroup.map((scheme) => (
                                        <SchemeCard
                                            key={scheme.id}
                                            scheme={scheme}
                                            downloading={downloadingId === scheme.id}
                                            onDownload={() => void handleDownload(scheme.id)}
                                            onOpen={() => router.push(`/schemes/${scheme.id}`)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </section>
            ))}
        </div>
    );
}

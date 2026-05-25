'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    Calendar,
    CheckCircle,
    Circle,
    FileText,
    Target,
    Users,
} from 'lucide-react';
import { useCBCOutcomeSessionPage } from '@/app/plugins/cbc/hooks/useCBCOutcomeSessionPage';
import {
    CBCNav,
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
    CBCTeachingSessionNav,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export function CBCOutcomeSessionPage() {
    const params = useParams<{ sessionId: string; learningOutcomeId: string }>();
    const sessionId = Number(params.sessionId);
    const learningOutcomeId = Number(params.learningOutcomeId);
    const page = useCBCOutcomeSessionPage(sessionId, learningOutcomeId);

    if (page.loading) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <CBCNav />
                <CBCLoading message="Loading learning goal…" />
            </div>
        );
    }

    if (!page.session || !page.learningOutcome || !page.outcomeSession) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <CBCNav />
                <CBCError error="This learning goal is not part of this lesson." />
                <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes`}>
                    <Button variant="primary">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to what was taught
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Teaching', href: '/cbc/teaching' },
                { label: 'Lessons', href: '/cbc/teaching/sessions' },
                { label: page.session.subject_name ?? 'Lesson', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                { label: 'What Was Taught', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                { label: page.learningOutcome.code },
            ]} />
            <CBCTeachingSessionNav sessionId={sessionId} active="outcomes" />

            <Card className="shadow-sm">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                    <div className="shrink-0 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                        <Target className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <Badge
                                        variant="purple"
                                        size="lg"
                                        className="max-w-full whitespace-normal break-all font-mono font-semibold"
                                    >
                                        {page.learningOutcome.code}
                                    </Badge>
                                    <button
                                        onClick={page.handleToggleCovered}
                                        className="theme-border theme-focus-ring theme-hover-border-strong theme-hover-surface flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition-all"
                                    >
                                        {page.outcomeSession.covered ? (
                                            <>
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <span className="text-sm font-medium text-green-700">Taught</span>
                                            </>
                                        ) : (
                                            <>
                                                <Circle className="h-5 w-5 theme-subtle" />
                                                <span className="text-sm font-medium theme-muted">Mark as taught</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="mb-2 break-words theme-text">
                                    {page.learningOutcome.description}
                                </p>
                                {(page.learningOutcome.strand_name || page.learningOutcome.sub_strand_name) && (
                                    <div className="flex items-start gap-2 text-sm theme-muted">
                                        <BookOpen className="h-4 w-4 shrink-0" />
                                        <span className="break-words">
                                            {page.learningOutcome.strand_name} → {page.learningOutcome.sub_strand_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 border-t pt-4 theme-border">
                            <h3 className="mb-2 text-sm font-semibold theme-text">Lesson notes</h3>
                            {page.editingNotes ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={page.notes}
                                        onChange={event => page.setNotes(event.target.value)}
                                        placeholder="Add notes about how this learning goal was taught..."
                                        rows={3}
                                        className="theme-focus-ring theme-input w-full resize-none rounded-lg px-4 py-2 text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={page.handleSaveNotes}
                                            disabled={page.saving}
                                        >
                                            {page.saving ? 'Saving...' : 'Save notes'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                page.setEditingNotes(false);
                                                page.setNotes(page.outcomeSession?.notes || '');
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : page.outcomeSession.notes ? (
                                <div className="theme-card-muted rounded-lg p-3">
                                    <p className="break-words text-sm italic theme-text">{page.outcomeSession.notes}</p>
                                    <button
                                        onClick={() => page.setEditingNotes(true)}
                                        className="theme-link mt-1 text-xs hover:underline"
                                    >
                                        Edit notes
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => page.setEditingNotes(true)}
                                    className="theme-link text-sm hover:underline"
                                >
                                    + Add lesson notes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="theme-surface-muted shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-semibold theme-text">
                    <Calendar className="h-5 w-5 theme-muted" />
                    Lesson context
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="theme-muted">Subject:</span>
                        <p className="break-words font-medium theme-text">{page.session.subject_name}</p>
                    </div>
                    <div>
                        <span className="theme-muted">Class:</span>
                        <p className="break-words font-medium theme-text">{page.session.cohort_name}</p>
                    </div>
                    <div>
                        <span className="theme-muted">Lesson date:</span>
                        <p className="font-medium theme-text">
                            {new Date(page.session.session_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="border-blue-500/20 bg-blue-500/10 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="shrink-0 rounded-lg bg-blue-600 p-3">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="mb-1 text-lg font-semibold theme-text">
                                Learning observations
                            </h3>
                            <p className="text-sm theme-muted">
                                Record class performance or learner observations for this learning goal.
                            </p>
                            {page.outcomeSession.evidence_count !== undefined && page.outcomeSession.evidence_count > 0 && (
                                <Badge variant="blue" size="sm" className="mt-2">
                                    {page.outcomeSession.evidence_count} performance record{page.outcomeSession.evidence_count !== 1 ? 's' : ''}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Link
                        href={`/cbc/teaching/sessions/${sessionId}/outcomes/${learningOutcomeId}/evidence`}
                        className="w-full sm:w-auto"
                    >
                        <Button variant="primary" size="lg" className="w-full sm:w-auto">
                            <Users className="mr-2 h-5 w-5" />
                            Record performance
                        </Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
}

'use client';

// ============================================================================
// app/core/components/topics/TopicBrowserComponents.tsx
//
// Components for the topics browser page.
// No any. Typed props. No API calls.
// AcademicNav is reused from AcademicProgressComponents — not duplicated here.
// ============================================================================

import Link from 'next/link';
import { useState } from 'react';
import {
    ChevronDown, ChevronRight, FileText, Layers,
    AlertCircle,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { useSubtopics } from '@/app/core/hooks/useTopics';
import type { Topic } from '@/app/core/types/topics';

// ── TopicRow ──────────────────────────────────────────────────────────────

interface TopicRowProps {
    topic: Topic;
}

export function TopicRow({ topic }: TopicRowProps) {
    const [open, setOpen] = useState(false);
    const { subtopics, loading } = useSubtopics(open ? topic.id : undefined);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all text-left"
            >
                <div className="shrink-0">
                    {open
                        ? <ChevronDown className="h-5 w-5 text-blue-600" />
                        : <ChevronRight className="h-5 w-5 text-gray-400" />
                    }
                </div>
                <Badge variant="blue" size="md" className="font-mono shrink-0">
                    {topic.code}
                </Badge>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{topic.name}</p>
                    {topic.description && (
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{topic.description}</p>
                    )}
                </div>
                <Badge variant="default" size="sm" className="shrink-0">
                    {topic.subtopics_count} subtopic{topic.subtopics_count !== 1 ? 's' : ''}
                </Badge>
            </button>

            {open && (
                <div className="border-t border-gray-100 bg-white">
                    {loading ? (
                        <div className="py-8 text-center">
                            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                            <p className="text-sm text-gray-500">Loading subtopics...</p>
                        </div>
                    ) : subtopics.length === 0 ? (
                        <div className="px-5 py-6 text-center">
                            <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">No subtopics yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {subtopics.map(subtopic => (
                                <div
                                    key={subtopic.id}
                                    className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                                >
                                    <FileText className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <Badge variant="purple" size="sm" className="font-mono mb-1.5 inline-block">
                                            {subtopic.code}
                                        </Badge>
                                        <p className="text-sm font-medium text-gray-900">{subtopic.name}</p>
                                        {subtopic.description && (
                                            <p className="text-xs text-gray-500 mt-0.5">{subtopic.description}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400 shrink-0">
                                        Seq {subtopic.sequence}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── SubjectSection ────────────────────────────────────────────────────────

interface SubjectSectionProps {
    csId: number;
    label: string;
    topics: Topic[];
    isAdmin: boolean;
}

export function SubjectSection({ csId: _, label, topics, isAdmin }: SubjectSectionProps) {
    return (
        <div>
            <div className="flex items-center gap-3 mb-3">
                <Layers className="h-4 w-4 text-gray-400 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                <Badge variant="info" size="sm">{topics.length}</Badge>
            </div>

            {topics.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    No topics added for this subject yet.
                    {isAdmin && (
                        <Link href="/academic/topics" className="text-blue-600 hover:underline ml-1">
                            Add topics
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {topics.map(topic => (
                        <TopicRow key={topic.id} topic={topic} />
                    ))}
                </div>
            )}
        </div>
    );
}
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle,
    Circle,
    Plus,
    Loader2,
    ChevronDown,
    ChevronRight,
    BookOpen,
} from 'lucide-react';
import { topicAPI, subtopicAPI, topicSessionLinkAPI } from '@/app/core/api/topics';
import { Topic, Subtopic, TopicSessionLink } from '@/app/core/types/topics';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';

interface Props {
    sessionId: number;
    subjectId: number;
    readOnly?: boolean;
}

interface SubtopicRowProps {
    subtopic: Subtopic;
    link: TopicSessionLink | undefined;
    onLink: (subtopicId: number) => Promise<void>;
    onMarkCovered: (linkId: number) => Promise<void>;
    actionInProgress: boolean;
    readOnly: boolean;
}

function SubtopicRow({
    subtopic,
    link,
    onLink,
    onMarkCovered,
    actionInProgress,
    readOnly,
}: SubtopicRowProps) {
    const isLinked = !!link;
    const isCovered = link?.covered ?? false;

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isCovered
                ? 'bg-green-50 border border-green-100 opacity-75 cursor-not-allowed'
                : isLinked
                    ? 'bg-blue-50 border border-blue-100'
                    : 'bg-white border border-gray-100 hover:border-gray-200'
                }`}
        >
            <div className="shrink-0">
                {isCovered ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                ) : isLinked ? (
                    <Circle className="h-5 w-5 text-blue-400" />
                ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-500">{subtopic.code}</span>
                    <span className={`text-sm font-medium ${isCovered ? 'text-gray-400' : 'text-gray-900'}`}>
                        {subtopic.name}
                    </span>
                </div>
                {subtopic.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{subtopic.description}</p>
                )}
            </div>

            <div className="shrink-0">
                {isCovered ? (
                    <Badge variant="success" size="sm">
                        <CheckCircle className="h-3 w-3 mr-1 inline" />
                        Covered
                    </Badge>
                ) : readOnly ? (
                    isLinked ? <Badge variant="info" size="sm">Planned</Badge> : null
                ) : isLinked ? (
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onMarkCovered(link!.id)}
                        disabled={actionInProgress}
                    >
                        {actionInProgress ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            'Mark Covered'
                        )}
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onLink(subtopic.id)}
                        disabled={actionInProgress}
                    >
                        {actionInProgress ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <>
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}

interface TopicGroupProps {
    topic: Topic;
    subtopics: Subtopic[];
    links: TopicSessionLink[];
    onLink: (subtopicId: number) => Promise<void>;
    onMarkCovered: (linkId: number) => Promise<void>;
    actionsInProgress: Set<number>;
    readOnly: boolean;
    isOpen: boolean;
    onToggle: () => void;
}

function TopicGroup({
    topic,
    subtopics,
    links,
    onLink,
    onMarkCovered,
    actionsInProgress,
    readOnly,
    onToggle,
    isOpen,
}: TopicGroupProps) {

    const coveredCount = subtopics.filter(s =>
        links.find(l => l.subtopic === s.id && l.covered)
    ).length;
    const linkedCount = subtopics.filter(s =>
        links.find(l => l.subtopic === s.id)
    ).length;

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => onToggle()}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                {isOpen
                    ? <ChevronDown className="h-4 w-4 text-blue-600 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                }
                <Badge variant="blue" size="sm" className="font-mono shrink-0">{topic.code}</Badge>
                <span className="font-semibold text-gray-900 flex-1">{topic.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                    {coveredCount > 0 && (
                        <Badge variant="success" size="sm">{coveredCount} covered</Badge>
                    )}
                    {linkedCount > coveredCount && (
                        <Badge variant="info" size="sm">{linkedCount - coveredCount} planned</Badge>
                    )}
                    <Badge variant="default" size="sm">{subtopics.length} total</Badge>
                </div>
            </button>

            {isOpen && (
                <div className="p-3 space-y-2">
                    {subtopics.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-3">No subtopics</p>
                    ) : (
                        subtopics.map(subtopic => (
                            <SubtopicRow
                                key={subtopic.id}
                                subtopic={subtopic}
                                link={links.find(l => l.subtopic === subtopic.id)}
                                onLink={onLink}
                                onMarkCovered={onMarkCovered}
                                actionInProgress={actionsInProgress.has(subtopic.id)}
                                readOnly={readOnly}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export function SessionSubtopicLinker({ sessionId, subjectId, readOnly = false }: Props) {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [subtopicsByTopic, setSubtopicsByTopic] = useState<Record<number, Subtopic[]>>({});
    const [links, setLinks] = useState<TopicSessionLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionsInProgress, setActionsInProgress] = useState<Set<number>>(new Set());
    const [openTopics, setOpenTopics] = useState<Set<number>>(() => {
        try {
            const stored = localStorage.getItem(`session-${sessionId}-open-topics`);
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    });

    useEffect(() => {
        if (!subjectId || !sessionId) return;

        const load = async () => {
            setLoading(true);
            try {
                const [topicsData, subtopicsData, linksData] = await Promise.all([
                    topicAPI.getAll({ subject: subjectId }),
                    subtopicAPI.getAll({ topic__subject: subjectId, page_size: 1000 }),
                    topicSessionLinkAPI.getAll({ session: sessionId }),
                ]);

                const topicsArray = Array.isArray(topicsData)
                    ? topicsData
                    : (topicsData as { results?: Topic[] })?.results ?? [];

                const subtopicsArray = Array.isArray(subtopicsData)
                    ? subtopicsData
                    : (subtopicsData as { results?: Subtopic[] })?.results ?? [];

                const linksArray = Array.isArray(linksData)
                    ? linksData
                    : (linksData as { results?: TopicSessionLink[] })?.results ?? [];

                // Group subtopics by topic id client-side
                const subtopicMap: Record<number, Subtopic[]> = {};
                for (const sub of subtopicsArray) {
                    if (!subtopicMap[sub.topic]) subtopicMap[sub.topic] = [];
                    subtopicMap[sub.topic].push(sub);
                }

                setTopics(topicsArray);
                setSubtopicsByTopic(subtopicMap);
                setLinks(linksArray);
            } catch (err) {
                console.error('Failed to load session subtopic data', err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [subjectId, sessionId]);

    const toggleTopic = (topicId: number) => {
        setOpenTopics(prev => {
            const next = new Set(prev);
            next.has(topicId) ? next.delete(topicId) : next.add(topicId);
            try {
                localStorage.setItem(`session-${sessionId}-open-topics`, JSON.stringify([...next]));
            } catch { }
            return next;
        });
    };

    const handleLink = async (subtopicId: number) => {
        setActionsInProgress(prev => new Set(prev).add(subtopicId));
        try {
            const newLink = await topicSessionLinkAPI.create({
                session: sessionId,
                subtopic: subtopicId,
            });
            setLinks(prev => [...prev, newLink]);
        } catch (err) {
            console.error('Failed to link subtopic', err);
        } finally {
            setActionsInProgress(prev => {
                const next = new Set(prev);
                next.delete(subtopicId);
                return next;
            });
        }
    };

    const handleMarkCovered = async (linkId: number) => {
        const link = links.find(l => l.id === linkId);
        if (!link) return;

        setActionsInProgress(prev => new Set(prev).add(link.subtopic));
        try {
            const updated = await topicSessionLinkAPI.markCovered(linkId);
            setLinks(prev => prev.map(l => l.id === linkId ? updated : l));
        } catch (err) {
            console.error('Failed to mark covered', err);
        } finally {
            setActionsInProgress(prev => {
                const next = new Set(prev);
                next.delete(link.subtopic);
                return next;
            });
        }
    };

    const stats = useMemo(() => {
        const allSubtopics = Object.values(subtopicsByTopic).flat();
        const covered = links.filter(l => l.covered).length;
        const planned = links.filter(l => !l.covered).length;
        return { total: allSubtopics.length, covered, planned };
    }, [subtopicsByTopic, links]);

    if (loading) {
        return (
            <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading subtopics...</p>
            </div>
        );
    }

    if (topics.length === 0) {
        return (
            <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl">
                <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                    No topics found for this subject. Ask your admin to set up the curriculum content.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary strip */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">{stats.covered}</span> covered
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">{stats.planned}</span> planned
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-gray-300" />
                    <span className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">{stats.total}</span> total
                    </span>
                </div>
            </div>

            {!readOnly && (
                <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <strong>Add</strong> subtopics you plan to cover in this session. After teaching,
                    click <strong>Mark Covered</strong> to record coverage. Covered subtopics update
                    your cohort&apos;s progress tracker permanently.
                </p>
            )}

            <div className="space-y-3">
                {topics.map(topic => (
                    <TopicGroup
                        key={topic.id}
                        topic={topic}
                        subtopics={subtopicsByTopic[topic.id] ?? []}
                        links={links.filter(l =>
                            (subtopicsByTopic[topic.id] ?? []).some(s => s.id === l.subtopic)
                        )}
                        onLink={handleLink}
                        onMarkCovered={handleMarkCovered}
                        actionsInProgress={actionsInProgress}
                        readOnly={readOnly}
                        isOpen={openTopics.has(topic.id)}
                        onToggle={() => toggleTopic(topic.id)}
                    />
                ))}
            </div>
        </div>
    );
}
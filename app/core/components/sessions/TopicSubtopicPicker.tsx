'use client';

// ============================================================================
// app/core/components/sessions/TopicSubtopicPicker.tsx
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { topicAPI } from '@/app/core/api/topics';
import type { Topic, Subtopic } from '@/app/core/types/topics';

interface TopicSubtopicPickerProps {
    subjectId: number;
    onSelectionChange: (topic: Topic | null, subtopics: Subtopic[]) => void;
}

export function TopicSubtopicPicker({ subjectId, onSelectionChange }: TopicSubtopicPickerProps) {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [selectedSubtopics, setSelectedSubtopics] = useState<Subtopic[]>([]);
    const [topicSearch, setTopicSearch] = useState('');
    const [subtopicSearch, setSubtopicSearch] = useState('');
    const [loadingTopics, setLoadingTopics] = useState(false);
    const [loadingSubtopics, setLoadingSubtopics] = useState(false);

    useEffect(() => {
        if (!subjectId) return;

        setLoadingTopics(true);

        topicAPI.getAll({ subject: subjectId })
            .then(data => {
                const list = Array.isArray(data)
                    ? data
                    : (data as { results?: Topic[] })?.results ?? [];

                setTopics(list);
            })
            .catch(() => setTopics([]))
            .finally(() => setLoadingTopics(false));

    }, [subjectId]);

    useEffect(() => {
        if (!selectedTopic) {
            setSubtopics([]);
            setSelectedSubtopics([]);
            return;
        }

        setLoadingSubtopics(true);

        topicAPI.getSubtopics(selectedTopic.id)
            .then(data => setSubtopics(Array.isArray(data) ? data : []))
            .catch(() => setSubtopics([]))
            .finally(() => setLoadingSubtopics(false));

    }, [selectedTopic]);


    useEffect(() => {
        onSelectionChange(selectedTopic, selectedSubtopics);
    }, [selectedTopic, selectedSubtopics, onSelectionChange]);

    const filteredTopics = useMemo(() => {
        const q = topicSearch.toLowerCase().trim();
        if (!q) return topics;
        return topics.filter(
            t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
        );
    }, [topics, topicSearch]);

    const filteredSubtopics = useMemo(() => {
        const q = subtopicSearch.toLowerCase().trim();
        if (!q) return subtopics;
        return subtopics.filter(
            s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
        );
    }, [subtopics, subtopicSearch]);

    const handleTopicSelect = (topic: Topic) => {
        setSelectedTopic(topic);
        setSelectedSubtopics([]);
        setTopicSearch('');
    };

    const handleTopicClear = () => {
        setSelectedTopic(null);
        setSelectedSubtopics([]);
        setSubtopics([]);
    };

    const toggleSubtopic = (subtopic: Subtopic) => {
        setSelectedSubtopics(prev =>
            prev.find(s => s.id === subtopic.id)
                ? prev.filter(s => s.id !== subtopic.id)
                : [...prev, subtopic]
        );
    };

    if (!subjectId) return null;

    return (
        <div className="space-y-4">
            {/* ── Topic selector ─────────────────────────────────────── */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic <span className="text-red-500">*</span>
                </label>

                {selectedTopic ? (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Badge variant="blue" size="md" className="font-mono shrink-0">
                            {selectedTopic.code}
                        </Badge>
                        <span className="font-medium text-gray-900 flex-1">{selectedTopic.name}</span>
                        <button
                            type="button"
                            onClick={handleTopicClear}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={topicSearch}
                                onChange={e => setTopicSearch(e.target.value)}
                                placeholder="Search topics..."
                                className="w-full pl-9 pr-4 py-2.5 text-sm border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            {loadingTopics ? (
                                <p className="py-6 text-center text-sm text-gray-500">Loading topics...</p>
                            ) : filteredTopics.length === 0 ? (
                                <p className="py-6 text-center text-sm text-gray-500">
                                    {topics.length === 0 ? 'No topics for this subject yet' : 'No topics match your search'}
                                </p>
                            ) : (
                                filteredTopics.map(topic => (
                                    <button
                                        key={topic.id}
                                        type="button"
                                        onClick={() => handleTopicSelect(topic)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                    >
                                        <Badge variant="blue" size="sm" className="font-mono shrink-0">
                                            {topic.code}
                                        </Badge>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">{topic.name}</p>
                                            {topic.description && (
                                                <p className="text-xs text-gray-500 truncate">{topic.description}</p>
                                            )}
                                        </div>
                                        <Badge variant="default" size="sm" className="shrink-0">
                                            {topic.subtopics_count}
                                        </Badge>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Subtopic multi-select ──────────────────────────────── */}
            {selectedTopic && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subtopics to cover
                        <span className="text-gray-400 font-normal ml-1">(select all that apply)</span>
                    </label>

                    {loadingSubtopics ? (
                        <p className="py-4 text-center text-sm text-gray-500 border border-gray-200 rounded-lg">
                            Loading subtopics...
                        </p>
                    ) : subtopics.length === 0 ? (
                        <p className="py-4 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
                            No subtopics for this topic yet
                        </p>
                    ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            {subtopics.length > 5 && (
                                <div className="relative border-b border-gray-200">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={subtopicSearch}
                                        onChange={e => setSubtopicSearch(e.target.value)}
                                        placeholder="Search subtopics..."
                                        className="w-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                                    />
                                </div>
                            )}

                            <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                                {filteredSubtopics.map(subtopic => {
                                    const isSelected = selectedSubtopics.some(s => s.id === subtopic.id);
                                    return (
                                        <button
                                            key={subtopic.id}
                                            type="button"
                                            onClick={() => toggleSubtopic(subtopic)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${isSelected ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                                                }`}>
                                                {isSelected && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                            <Badge variant="purple" size="sm" className="font-mono shrink-0">
                                                {subtopic.code}
                                            </Badge>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">{subtopic.name}</p>
                                                {subtopic.description && (
                                                    <p className="text-xs text-gray-500 truncate">{subtopic.description}</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedSubtopics.length > 0 && (
                                <div className="px-4 py-2 bg-green-50 border-t border-green-100 flex items-center justify-between">
                                    <span className="text-xs text-green-700 font-medium">
                                        {selectedSubtopics.length} subtopic{selectedSubtopics.length !== 1 ? 's' : ''} selected
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSubtopics([])}
                                        className="text-xs text-green-600 hover:text-green-800"
                                    >
                                        Clear all
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
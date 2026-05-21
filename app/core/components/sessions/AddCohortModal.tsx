'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, Users } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { useAvailableSessionCohortSubjects } from '@/app/core/hooks/useSessions';

interface AddCohortModalProps {
    sessionId: number;
    isOpen: boolean;
    onClose: () => void;
    onAddCohortSubject: (cohortSubjectId: number) => Promise<void>;
}

export function AddCohortModal({
    sessionId,
    isOpen,
    onClose,
    onAddCohortSubject,
}: AddCohortModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCohortSubjectId, setSelectedCohortSubjectId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const {
        data,
        cohortSubjects,
        loading,
        error,
    } = useAvailableSessionCohortSubjects(sessionId, isOpen);
    const isLoading = loading || (isOpen && !error && data === null);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSelectedCohortSubjectId(null);
            setSubmitting(false);
        }
    }, [isOpen]);

    const filteredCohortSubjects = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return cohortSubjects;

        return cohortSubjects.filter((cohortSubject) => (
            cohortSubject.cohort_name.toLowerCase().includes(query)
            || cohortSubject.cohort_level.toLowerCase().includes(query)
            || (cohortSubject.academic_year ?? '').toLowerCase().includes(query)
            || cohortSubject.subject_name.toLowerCase().includes(query)
        ));
    }, [cohortSubjects, searchQuery]);

    const handleAdd = async () => {
        if (!selectedCohortSubjectId) return;

        setSubmitting(true);
        try {
            await onAddCohortSubject(selectedCohortSubjectId);
            onClose();
        } catch (err) {
            console.error('Failed to add cohort subject to session:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Participating Class"
            size="lg"
        >
            <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Add another class when this lesson is being taught together. Linked classes stay active here until you unlink them.
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search compatible classes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="max-h-96 space-y-2 overflow-y-auto">
                    {isLoading ? (
                        <div className="py-8 text-center text-sm text-gray-500">
                            Loading compatible classes...
                        </div>
                    ) : filteredCohortSubjects.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500">
                            {searchQuery
                                ? 'No compatible classes match your search.'
                                : 'No compatible classes are available right now.'}
                        </div>
                    ) : (
                        filteredCohortSubjects.map((cohortSubject) => {
                            const isSelected = selectedCohortSubjectId === cohortSubject.cohort_subject_id;

                            return (
                                <button
                                    key={cohortSubject.cohort_subject_id}
                                    type="button"
                                    onClick={() => setSelectedCohortSubjectId(cohortSubject.cohort_subject_id)}
                                    className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-medium text-gray-900">
                                                    {cohortSubject.cohort_name}
                                                </span>
                                                <Badge variant="info" size="sm">
                                                    {cohortSubject.subject_name}
                                                </Badge>
                                            </div>
                                            <div className="mt-1 text-sm text-gray-500">
                                                {cohortSubject.cohort_level}
                                                {cohortSubject.academic_year ? ` • ${cohortSubject.academic_year}` : ''}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {cohortSubject.subject_name}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Users className="h-4 w-4 text-gray-400" />
                                            <span>{cohortSubject.learner_count} learners</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAdd}
                        disabled={!selectedCohortSubjectId || submitting}
                        className="flex-1"
                    >
                        {submitting ? 'Adding...' : 'Add class'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

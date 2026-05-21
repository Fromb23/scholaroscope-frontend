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
                <div className="theme-info-surface rounded-lg px-4 py-3 text-sm">
                    Add another class when this lesson is being taught together. Linked classes stay active here until you unlink them.
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 theme-subtle" />
                    <input
                        type="text"
                        placeholder="Search compatible classes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="theme-focus-ring theme-input w-full rounded-lg py-2 pl-10 pr-4"
                    />
                </div>

                {error && (
                    <div className="theme-danger-surface flex items-start gap-2 rounded-lg p-3 text-sm">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-danger)]" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="max-h-96 space-y-2 overflow-y-auto">
                    {isLoading ? (
                        <div className="py-8 text-center text-sm theme-muted">
                            Loading compatible classes...
                        </div>
                    ) : filteredCohortSubjects.length === 0 ? (
                        <div className="py-8 text-center text-sm theme-muted">
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
                                            ? 'theme-info-surface-strong'
                                            : 'theme-border theme-surface theme-hover-border-strong theme-hover-surface'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-medium theme-text">
                                                    {cohortSubject.cohort_name}
                                                </span>
                                                <Badge variant="info" size="sm">
                                                    {cohortSubject.subject_name}
                                                </Badge>
                                            </div>
                                            <div className="mt-1 text-sm theme-muted">
                                                {cohortSubject.cohort_level}
                                                {cohortSubject.academic_year ? ` • ${cohortSubject.academic_year}` : ''}
                                            </div>
                                            <div className="mt-1 text-xs theme-subtle">
                                                {cohortSubject.subject_name}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm theme-muted">
                                            <Users className="h-4 w-4 theme-subtle" />
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

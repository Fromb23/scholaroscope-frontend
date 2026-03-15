// ============================================================================
// app/components/sessions/AddCohortModal.tsx - NEW: Add Cohort to Session
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { X, Search, Users } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { useCohorts } from '@/app/core/hooks/useCohorts';

interface AddCohortModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (cohortId: number) => Promise<void>;
    excludeCohortIds: number[]; // Already linked cohorts
    sessionSubjectId?: number; // Optional: filter by subject
}

export function AddCohortModal({
    isOpen,
    onClose,
    onAdd,
    excludeCohortIds,
    sessionSubjectId
}: AddCohortModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const { cohorts } = useCohorts();

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSelectedCohortId(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Filter available cohorts
    const availableCohorts = cohorts
        .filter(c => !excludeCohortIds.includes(c.id))
        .filter(c => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                c.name.toLowerCase().includes(query) ||
                c.level.toLowerCase().includes(query)
            );
        });
    console.log("Available Cohorts", availableCohorts);

    const handleAdd = async () => {
        if (!selectedCohortId) return;

        setLoading(true);
        try {
            await onAdd(selectedCohortId);
            onClose();
        } catch (error) {
            console.error('Failed to add cohort:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <Card className="relative z-10 w-full max-w-2xl">
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Add Cohort to Session
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search cohorts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Cohort List */}
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {availableCohorts.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    {excludeCohortIds.length > 0
                                        ? 'No more cohorts available'
                                        : 'No cohorts found'}
                                </div>
                            ) : (
                                availableCohorts.map((cohort) => (
                                    <button
                                        key={cohort.id}
                                        onClick={() => setSelectedCohortId(cohort.id)}
                                        className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${selectedCohortId === cohort.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {cohort.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {cohort.level} • {cohort.academic_year}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {cohort.students_count || 0} students
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
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
                                disabled={!selectedCohortId || loading}
                                className="flex-1"
                            >
                                {loading ? 'Adding...' : 'Add Cohort'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
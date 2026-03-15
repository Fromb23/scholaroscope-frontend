'use client';

import { useState } from 'react';
import { Users, Plus, X, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { useSessionCohorts } from '@/app/core/hooks/useSessions';
import { AddCohortModal } from './AddCohortModal';

interface ParticipatingCohortsProps {
    sessionId: number;
    sessionSubjectId?: number;
    primaryCohortId: number;
    isHistorical?: boolean;  // past-year session — no add/unlink
}

export function ParticipatingCohorts({
    sessionId,
    sessionSubjectId,
    isHistorical = false,
}: ParticipatingCohortsProps) {
    const [open, setOpen] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [confirmUnlink, setConfirmUnlink] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const { linkedCohorts, loading, linkCohort, unlinkCohort } = useSessionCohorts(sessionId);

    const handleAddCohort = async (cohortId: number) => {
        setActionError(null);
        try {
            await linkCohort(cohortId);
            setShowAddModal(false);
        } catch (err: any) {
            setActionError(err?.response?.data?.detail ?? err?.message ?? 'Failed to add cohort.');
        }
    };

    const handleUnlinkCohort = async (cohortId: number) => {
        setActionError(null);
        try {
            await unlinkCohort(cohortId);
            setConfirmUnlink(null);
        } catch (err: any) {
            setActionError(err?.response?.data?.detail ?? err?.message ?? 'Failed to unlink cohort.');
        }
    };

    const count = linkedCohorts.length;

    return (
        <>
            {/* Compact trigger row */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button
                    type="button"
                    onClick={() => setOpen(v => !v)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                    <Users className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-700 flex-1">
                        Participating Cohorts
                    </span>

                    {loading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    ) : count > 0 ? (
                        <Badge variant="info" size="sm">{count}</Badge>
                    ) : (
                        <span className="text-xs text-gray-400">None linked</span>
                    )}

                    {open
                        ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                    }
                </button>

                {/* Expanded panel */}
                {open && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">

                        {/* Action error */}
                        {actionError && (
                            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span className="flex-1">{actionError}</span>
                                <button onClick={() => setActionError(null)}>
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Empty */}
                        {count === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-2">
                                No additional cohorts linked. The primary cohort is always included.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {linkedCohorts.map(link => {
                                    const isActive = link.is_active === true;
                                    const isConfirming = confirmUnlink === link.cohort;

                                    return (
                                        <div
                                            key={link.id}
                                            className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-sm font-medium text-gray-900 truncate">
                                                    {link.cohort_name}
                                                </span>
                                                <Badge
                                                    variant={isActive ? 'default' : 'warning'}
                                                    size="sm"
                                                >
                                                    {isActive ? 'Active' : 'Historical'}
                                                </Badge>
                                            </div>

                                            {isActive && !isHistorical && (
                                                isConfirming ? (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-xs text-gray-500">Unlink?</span>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => handleUnlinkCohort(link.cohort)}
                                                        >
                                                            Confirm
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setConfirmUnlink(null)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmUnlink(link.cohort)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                                                        title="Unlink cohort"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Preservation note — only when there are linked cohorts */}
                                <p className="text-xs text-gray-400 pt-1">
                                    Unlinking a cohort does not remove attendance records.
                                </p>
                            </div>
                        )}

                        {/* Add button — hidden for historical sessions */}
                        {!isHistorical && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowAddModal(true)}
                                className="w-full"
                            >
                                <Plus className="h-3.5 w-3.5 mr-2" />
                                Add Cohort
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <AddCohortModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddCohort}
                excludeCohortIds={linkedCohorts.map(c => c.cohort)}
                sessionSubjectId={sessionSubjectId}
            />
        </>
    );
}
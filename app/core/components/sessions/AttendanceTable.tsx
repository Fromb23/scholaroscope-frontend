'use client';

// ============================================================================
// app/core/components/sessions/AttendanceTable.tsx
//
// Renders the attendance marking table for a session.
// Receives draft state and handlers from useAttendanceDraft hook.
// ============================================================================

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { DataTable, Column } from '@/app/components/ui/Table';
import type { AttendanceRecord } from '@/app/core/types/session';
import type { AttendanceDraft } from '@/app/core/hooks/useAttendanceDraft';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK'] as const;

interface PaginationState {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

interface AttendanceTableProps {
    records: AttendanceRecord[];
    draft: AttendanceDraft;
    loading: boolean;
    saving: boolean;
    saveError: string | null;
    readOnly: boolean;
    pagination?: PaginationState;
    onUpdateStatus: (studentId: number, status: string) => void;
    onUpdateNotes: (studentId: number, notes: string) => void;
    onMarkAll: (status: string) => void;
    onSave: () => Promise<void>;
    onDismissError: () => void;
    onPaginationChange?: (page: number, pageSize: number) => void;
}

type AttendanceWithIndex = { [key: string]: unknown } & AttendanceRecord;

export function AttendanceTable({
    records, draft, loading, saving, saveError,
    readOnly, pagination,
    onUpdateStatus, onUpdateNotes, onMarkAll, onSave,
    onDismissError, onPaginationChange,
}: AttendanceTableProps) {
    const [localSearch, setLocalSearch] = useState('');
    const filteredRecords = useMemo(() => {
        const query = localSearch.trim().toLowerCase();

        if (!query) {
            return records;
        }

        return records.filter((record) => {
            const draftEntry = draft[record.student];
            const haystack = [
                record.student_name,
                record.student_admission,
                record.subject_name,
                record.cohort_name,
                draftEntry?.status ?? record.status ?? '',
                draftEntry?.notes ?? record.notes ?? '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [draft, localSearch, records]);
    const hasActiveSearch = localSearch.trim().length > 0;

    const columns: Column<AttendanceRecord>[] = [
        {
            key: 'student_name',
            header: 'Learner',
            render: r => (
                <div>
                    <Link
                        href={`/learners/${r.student}`}
                        className="font-medium text-blue-600 hover:underline"
                    >
                        {r.student_name}
                    </Link>
                    <div className="text-xs text-gray-500">{r.student_admission}</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: r => (
                <div className="flex gap-1 flex-nowrap">
                    {STATUSES.map(s => (
                        <button
                            key={s}
                            onClick={() => !readOnly && onUpdateStatus(r.student, s)}
                            disabled={readOnly}
                            className={`px-2 py-1 text-xs rounded-lg border transition-colors whitespace-nowrap ${draft[r.student]?.status === s
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : 'border-gray-200 hover:border-gray-400'
                                } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            ),
        },
        {
            key: 'notes',
            header: 'Notes',
            render: r => (
                <input
                    value={draft[r.student]?.notes ?? ''}
                    onChange={e => onUpdateNotes(r.student, e.target.value)}
                    disabled={readOnly}
                    className={`border rounded-lg px-3 py-1.5 text-sm w-full ${readOnly ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''
                        }`}
                    placeholder="Optional note..."
                />
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                    {readOnly ? 'Attendance Records' : 'Mark Attendance'}
                </h2>
                {!readOnly && (
                    <Button onClick={onSave} disabled={saving} className="hidden sm:inline-flex">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                )}
            </div>

            {saveError && (
                <ErrorState message={saveError} onRetry={onDismissError} fullScreen={false} />
            )}

            {!readOnly && (
                <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={() => onMarkAll('PRESENT')}>
                        Mark all present
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onMarkAll('ABSENT')}>
                        Mark all absent
                    </Button>
                </div>
            )}

            {/* Horizontal scroll wrapper */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
                <div className="min-w-[520px]">
                    <DataTable
                        data={filteredRecords as AttendanceWithIndex[]}
                        columns={columns}
                        loading={loading}
                        enableSearch
                        onSearch={setLocalSearch}
                        searchPlaceholder="Search learners, admissions, class, subject, status, or notes"
                        emptyMessage={hasActiveSearch ? 'No learners match this search.' : 'No attendance records are available yet.'}
                        pagination={pagination}
                        onPaginationChange={onPaginationChange}
                    />
                </div>
            </div>

            {!readOnly && (
                <div className="sticky bottom-3 z-10 sm:hidden">
                    <div className="rounded-xl border px-3 py-3 shadow-lg theme-border theme-surface-elevated">
                        <Button onClick={onSave} disabled={saving} className="w-full">
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? 'Saving...' : 'Save attendance'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Check, ChevronDown, X } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { cbcCatalogAPI, cbcSelectionAPI } from '@/app/plugins/cbc/api/cbc';
import type {
    CBCCatalog,
    CBCCatalogLevel,
    CBCStrandCatalogEntry,
    CBCSubStrandCatalogEntry,
} from '@/app/plugins/cbc/types/cbc';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectionState {
    // strandId → Set<subStrandId>
    strands: Record<number, Set<number>>;
}

interface DiffResult {
    addSubStrands: number[];
    removeSubStrands: number[];
    addCount: number;
    removeCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cloneSelection(s: SelectionState): SelectionState {
    return {
        strands: Object.fromEntries(
            Object.entries(s.strands).map(([k, v]) => [k, new Set(v)])
        ),
    };
}

function buildInitialSelection(catalog: CBCCatalog): SelectionState {
    const strands: Record<number, Set<number>> = {};
    catalog.subjects.forEach(subject => {
        subject.levels.forEach(level => {
            level.strands.forEach(strand => {
                strands[strand.id] = new Set(
                    strand.sub_strands
                        .filter(ss => ss.registered)
                        .map(ss => ss.id)
                );
            });
        });
    });
    return { strands };
}

function computeDiff(current: SelectionState, snap: SelectionState): DiffResult {
    const addSubStrands: number[] = [];
    const removeSubStrands: number[] = [];

    const allStrandIds = new Set([
        ...Object.keys(current.strands),
        ...Object.keys(snap.strands),
    ].map(Number));

    allStrandIds.forEach(strandId => {
        const curSubs = current.strands[strandId] ?? new Set<number>();
        const snapSubs = snap.strands[strandId] ?? new Set<number>();

        curSubs.forEach(id => { if (!snapSubs.has(id)) addSubStrands.push(id); });
        snapSubs.forEach(id => { if (!curSubs.has(id)) removeSubStrands.push(id); });
    });

    return {
        addSubStrands,
        removeSubStrands,
        addCount: addSubStrands.length,
        removeCount: removeSubStrands.length,
    };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubStrandRow({
    ss,
    checked,
    wasChecked,
    onChange,
}: {
    ss: CBCSubStrandCatalogEntry;
    checked: boolean;
    wasChecked: boolean;
    onChange: () => void;
}) {
    const isNew = checked && !wasChecked;
    const isRemoved = !checked && wasChecked;

    return (
        <label className={`flex items-center gap-3 px-12 py-2 hover:bg-blue-50 cursor-pointer ${isRemoved ? 'opacity-50' : ''}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
            />
            <span className="text-xs text-gray-700 flex-1">{ss.name}</span>
            <span className="text-xs font-mono text-gray-400">{ss.code}</span>
            <span className="flex items-center gap-1">
                {ss.registered && !isRemoved && <span className="text-xs text-green-500">✓</span>}
                {isNew && <span className="text-xs text-blue-500 font-medium">+ New</span>}
                {isRemoved && <span className="text-xs text-red-500 font-medium">− Remove</span>}
            </span>
        </label>
    );
}

function StrandRow({
    strand,
    selection,
    snapSelection,
    onToggleSubStrand,
    onToggleAllSubStrands,
}: {
    strand: CBCStrandCatalogEntry;
    selection: Set<number>;
    snapSelection: Set<number>;
    onToggleSubStrand: (ssId: number) => void;
    onToggleAllSubStrands: (ssIds: number[], selectAll: boolean) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const allIds = strand.sub_strands.map(ss => ss.id);
    const selectedCount = allIds.filter(id => selection.has(id)).length;
    const allSelected = selectedCount === allIds.length && allIds.length > 0;
    const partialSelected = selectedCount > 0 && selectedCount < allIds.length;

    return (
        <div className="border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50">
                <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = partialSelected; }}
                    onChange={() => onToggleAllSubStrands(allIds, !allSelected)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <button
                    onClick={() => setExpanded(e => !e)}
                    className="flex-1 flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{strand.name}</span>
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{strand.code}</span>
                        {strand.all_registered && !partialSelected && (
                            <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">All registered</span>
                        )}
                        {strand.any_registered && !strand.all_registered && (
                            <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">Partial</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{selectedCount}/{allIds.length} sub-strands</span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                </button>
            </div>

            {expanded && (
                <div className="bg-gray-50 border-t border-gray-100">
                    {strand.sub_strands.map(ss => (
                        <SubStrandRow
                            key={ss.id}
                            ss={ss}
                            checked={selection.has(ss.id)}
                            wasChecked={snapSelection.has(ss.id)}
                            onChange={() => onToggleSubStrand(ss.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function LevelSection({
    level,
    selection,
    snapSelection,
    onToggleSubStrand,
    onToggleAllSubStrands,
}: {
    level: CBCCatalogLevel;
    selection: SelectionState;
    snapSelection: SelectionState;
    onToggleSubStrand: (strandId: number, ssId: number) => void;
    onToggleAllSubStrands: (strandId: number, ssIds: number[], selectAll: boolean) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const allSubIds = level.strands.flatMap(s => s.sub_strands.map(ss => ss.id));
    const selectedCount = allSubIds.filter(id =>
        Object.values(selection.strands).some(s => s.has(id))
    ).length;

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-2">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 capitalize">{level.level}</span>
                    <span className="text-xs font-mono text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">{level.code}</span>
                    {level.all_registered && (
                        <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">All registered</span>
                    )}
                    {level.any_registered && !level.all_registered && (
                        <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">Partial</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{selectedCount}/{allSubIds.length} sub-strands</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {expanded && (
                <div className="divide-y divide-gray-100">
                    {level.strands.map(strand => (
                        <StrandRow
                            key={strand.id}
                            strand={strand}
                            selection={selection.strands[strand.id] ?? new Set()}
                            snapSelection={snapSelection.strands[strand.id] ?? new Set()}
                            onToggleSubStrand={ssId => onToggleSubStrand(strand.id, ssId)}
                            onToggleAllSubStrands={(ssIds, selectAll) =>
                                onToggleAllSubStrands(strand.id, ssIds, selectAll)
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface CBCCurriculumModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CBCCurriculumModal({ isOpen, onClose }: CBCCurriculumModalProps) {
    const [catalog, setCatalog] = useState<CBCCatalog | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ added: number; removed: number } | null>(null);

    const [selection, setSelection] = useState<SelectionState>({ strands: {} });
    const [snap, setSnap] = useState<SelectionState>({ strands: {} });

    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isOpen) {
            setCatalog(null);
            setSelection({ strands: {} });
            setSnap({ strands: {} });
            setExpandedSubjects(new Set());
            setError(null);
            setResult(null);
            return;
        }
        setLoading(true);
        cbcCatalogAPI.getCatalog()
            .then(data => {
                setCatalog(data);
                const initial = buildInitialSelection(data);
                setSelection(initial);
                setSnap(cloneSelection(initial));
            })
            .catch(() => setError('Could not load CBC curriculum catalog.'))
            .finally(() => setLoading(false));
    }, [isOpen]);

    const diff = useMemo(() => computeDiff(selection, snap), [selection, snap]);
    const hasChanges = diff.addCount > 0 || diff.removeCount > 0;

    const toggleSubStrand = (strandId: number, ssId: number) => {
        setSelection(prev => {
            const next = cloneSelection(prev);
            const set = next.strands[strandId] ?? new Set<number>();
            set.has(ssId) ? set.delete(ssId) : set.add(ssId);
            next.strands[strandId] = set;
            return next;
        });
    };

    const toggleAllSubStrands = (strandId: number, ssIds: number[], selectAll: boolean) => {
        setSelection(prev => {
            const next = cloneSelection(prev);
            next.strands[strandId] = selectAll ? new Set(ssIds) : new Set();
            return next;
        });
    };

    const handleSave = async () => {
        if (!hasChanges) return;
        setSaving(true);
        setError(null);
        try {
            let registered = 0;
            let unregistered = 0;

            if (diff.addSubStrands.length > 0) {
                const res = await cbcSelectionAPI.registerSubStrands(diff.addSubStrands);
                registered = res.registered;
            }

            if (diff.removeSubStrands.length > 0) {
                const res = await cbcSelectionAPI.unregisterSubStrands(diff.removeSubStrands);
                unregistered = res.unregistered;
            }

            setResult({ added: registered, removed: unregistered });
            setSnap(cloneSelection(selection));
        } catch {
            setError('Failed to save curriculum selection. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage CBC Curriculum" size="lg">
            <div className="space-y-4">

                {result && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                            <Check className="h-4 w-4 text-green-600 shrink-0" />
                            <div className="text-sm text-green-700 space-y-0.5">
                                {result.added > 0 && (
                                    <p>✅ {result.added} sub-strand{result.added !== 1 ? 's' : ''} added to your curriculum.</p>
                                )}
                                {result.removed > 0 && (
                                    <p>🗑 {result.removed} sub-strand{result.removed !== 1 ? 's' : ''} removed.</p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                            <Button variant="secondary" onClick={() => {
                                setResult(null);
                                setLoading(true);
                                cbcCatalogAPI.getCatalog()
                                    .then(data => {
                                        setCatalog(data);
                                        const initial = buildInitialSelection(data);
                                        setSelection(initial);
                                        setSnap(cloneSelection(initial));
                                    })
                                    .catch(() => setError('Could not reload.'))
                                    .finally(() => setLoading(false));
                            }}>
                                Continue Editing
                            </Button>
                            <Button variant="primary" onClick={onClose}>Done</Button>
                        </div>
                    </div>
                )}

                {!result && loading && (
                    <LoadingSpinner fullScreen={false} message="Loading curriculum..." />
                )}

                {!result && !loading && error && (
                    <ErrorBanner message={error} onDismiss={() => setError(null)} />
                )}

                {!result && !loading && catalog && (
                    <>
                        <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1 text-gray-500">
                                <span className="h-3 w-3 rounded border-2 border-blue-600 bg-blue-600 inline-block" />
                                Registered
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                                <span className="h-3 w-3 rounded border-2 border-gray-300 inline-block" />
                                Not registered
                            </span>
                            {hasChanges && (
                                <span className="ml-auto text-amber-600 font-medium">
                                    {diff.addCount > 0 && `+${diff.addCount} to add`}
                                    {diff.addCount > 0 && diff.removeCount > 0 && ' · '}
                                    {diff.removeCount > 0 && `−${diff.removeCount} to remove`}
                                </span>
                            )}
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {catalog.subjects.map(subject => {
                                const expanded = expandedSubjects.has(subject.code);
                                return (
                                    <div key={subject.code} className="border border-gray-200 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setExpandedSubjects(prev => {
                                                const n = new Set(prev);
                                                n.has(subject.code) ? n.delete(subject.code) : n.add(subject.code);
                                                return n;
                                            })}
                                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-blue-600" />
                                                <span className="text-sm font-semibold text-gray-900">{subject.name}</span>
                                                <span className="text-xs text-gray-400">
                                                    {subject.levels.length} level{subject.levels.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {expanded && (
                                            <div className="p-3 space-y-2 bg-white">
                                                {subject.levels.map(level => (
                                                    <LevelSection
                                                        key={level.code}
                                                        level={level}
                                                        selection={selection}
                                                        snapSelection={snap}
                                                        onToggleSubStrand={toggleSubStrand}
                                                        onToggleAllSubStrands={toggleAllSubStrands}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                                {hasChanges
                                    ? `${diff.addCount > 0 ? `+${diff.addCount} to add` : ''}${diff.addCount > 0 && diff.removeCount > 0 ? ' · ' : ''}${diff.removeCount > 0 ? `−${diff.removeCount} to remove` : ''}`
                                    : 'No changes'
                                }
                            </p>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                    disabled={saving || !hasChanges}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
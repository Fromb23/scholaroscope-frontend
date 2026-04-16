// app/plugins/cbc/components/outcomes/OutcomeRow.tsx
import Link from 'next/link';
import { CheckCircle, Circle, Trash2, FileText } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import type { OutcomeSessionWithEvidence } from '@/app/plugins/cbc/types/cbc';

interface Props {
    link: OutcomeSessionWithEvidence;
    sessionId: number;
    editingNotes: number | null;
    notesValue: string;
    markCoveredPending: boolean;
    removeLinkPending: boolean;
    onToggleCovered: (id: number, covered: boolean, notes: string) => void;
    onRemove: (id: number) => void;
    onEditNotes: (id: number, notes: string) => void;
    onSaveNotes: (id: number) => void;
    onCancelNotes: () => void;
    onNotesChange: (value: string) => void;
}

export function OutcomeRow({
    link, sessionId,
    editingNotes, notesValue,
    markCoveredPending, removeLinkPending,
    onToggleCovered, onRemove,
    onEditNotes, onSaveNotes, onCancelNotes, onNotesChange,
}: Props) {
    const isEditing = editingNotes === link.id;

    return (
        <div className={`border rounded-xl p-5 transition-all ${link.covered
            ? 'border-green-200 bg-green-50'
            : link.evidence_count > 0
                ? 'border-blue-200 bg-blue-50/30'
                : 'border-gray-200 bg-white hover:border-blue-200'
            }`}>
            <div className="flex items-start gap-4">
                <button
                    onClick={() => onToggleCovered(link.id, link.covered, link.notes)}
                    disabled={markCoveredPending}
                    className="mt-1 shrink-0"
                >
                    {link.covered
                        ? <CheckCircle className="h-6 w-6 text-green-600" />
                        : <Circle className="h-6 w-6 text-gray-300 hover:text-blue-600 transition-colors" />
                    }
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="purple" size="md" className="font-mono font-semibold">
                                {link.learning_outcome_code}
                            </Badge>
                            <span className="text-xs text-gray-500 hidden sm:inline">
                                {link.strand_name} → {link.sub_strand_name}
                            </span>
                        </div>
                        <button
                            onClick={() => onRemove(link.id)}
                            disabled={removeLinkPending}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{link.learning_outcome_description}</p>

                    {isEditing ? (
                        <div className="space-y-2">
                            <Input
                                label="Session notes"
                                value={notesValue}
                                onChange={e => onNotesChange(e.target.value)}
                                placeholder="How was this outcome covered?"
                            />
                            <div className="flex gap-2">
                                <Button variant="primary" size="sm"
                                    onClick={() => onSaveNotes(link.id)}
                                    disabled={markCoveredPending}>
                                    Save Notes
                                </Button>
                                <Button variant="ghost" size="sm" onClick={onCancelNotes}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : link.notes ? (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-700 italic">{link.notes}</p>
                            <button
                                onClick={() => onEditNotes(link.id, link.notes)}
                                className="text-xs text-blue-600 hover:underline mt-1">
                                Edit notes
                            </button>
                        </div>
                    ) : link.covered && (
                        <button
                            onClick={() => onEditNotes(link.id, '')}
                            className="text-sm text-blue-600 hover:underline">
                            + Add session notes
                        </button>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <Link
                            href={`/cbc/teaching/sessions/${sessionId}/outcomes/${link.learning_outcome}`}
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            <FileText className="h-4 w-4" />
                            Record Evidence
                        </Link>
                        {link.evidence_count > 0 && (
                            <Badge variant="green" size="sm">
                                {link.evidence_count} student{link.evidence_count !== 1 ? 's' : ''} recorded
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
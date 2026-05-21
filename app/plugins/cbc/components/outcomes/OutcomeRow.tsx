// app/plugins/cbc/components/outcomes/OutcomeRow.tsx
import Link from 'next/link';
import { CheckCircle, Circle, FileText, Lock, Trash2 } from 'lucide-react';
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
    const hasEvidence = link.evidence_count > 0;

    return (
        <div className={`w-full max-w-full overflow-hidden border rounded-xl p-4 transition-all sm:p-5 ${link.covered
            ? 'theme-success-surface'
            : hasEvidence
                ? 'theme-info-surface'
                : 'theme-border theme-surface theme-hover-border-strong'
            }`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <button
                    onClick={() => onToggleCovered(link.id, link.covered, link.notes)}
                    disabled={markCoveredPending}
                    className="shrink-0 self-start sm:mt-1"
                >
                    {link.covered
                        ? <CheckCircle className="h-6 w-6 text-green-600" />
                        : <Circle className="h-6 w-6 theme-subtle transition-colors hover:text-blue-600" />
                    }
                </button>

                <div className="flex-1 min-w-0">
                    <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant="purple"
                                    size="md"
                                    className="max-w-full whitespace-normal break-all font-mono font-semibold"
                                >
                                    {link.learning_outcome_code}
                                </Badge>
                                <span className="break-words text-xs theme-muted">
                                    {link.strand_name} → {link.sub_strand_name}
                                </span>
                            </div>
                        </div>
                        {hasEvidence ? (
                            <Badge variant="default" size="sm" className="inline-flex items-center gap-1 self-start">
                                <Lock className="h-3.5 w-3.5" />
                                Evidence recorded
                            </Badge>
                        ) : (
                            <button
                                onClick={() => onRemove(link.id)}
                                disabled={removeLinkPending}
                                className="self-start rounded-lg p-1.5 text-red-500 transition-colors theme-hover-danger"
                                aria-label="Remove learning goal from this lesson"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <p className="mb-3 break-words text-sm theme-text">{link.learning_outcome_description}</p>

                    {isEditing ? (
                        <div className="space-y-2">
                            <Input
                                label="Lesson notes"
                                value={notesValue}
                                onChange={e => onNotesChange(e.target.value)}
                                placeholder="How was this learning goal taught?"
                            />
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button variant="primary" size="sm"
                                    onClick={() => onSaveNotes(link.id)}
                                    disabled={markCoveredPending}>
                                    Save notes
                                </Button>
                                <Button variant="ghost" size="sm" onClick={onCancelNotes}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : link.notes ? (
                        <div className="theme-card-muted rounded-lg p-3">
                            <p className="break-words text-sm italic theme-text">{link.notes}</p>
                            <button
                                onClick={() => onEditNotes(link.id, link.notes)}
                                className="theme-link mt-1 text-xs hover:underline">
                                Edit notes
                            </button>
                        </div>
                    ) : link.covered && (
                        <button
                            onClick={() => onEditNotes(link.id, '')}
                            className="theme-link text-sm hover:underline">
                            + Add lesson notes
                        </button>
                    )}

                    <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between theme-border">
                        <Link
                            href={`/cbc/teaching/sessions/${sessionId}/outcomes/${link.learning_outcome}`}
                            className="theme-link inline-flex items-center gap-2 text-sm font-medium"
                        >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="break-words">Record performance</span>
                        </Link>
                        {hasEvidence && (
                            <Badge variant="green" size="sm" className="self-start sm:self-auto">
                                {link.evidence_count} learner{link.evidence_count !== 1 ? 's' : ''} observed
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

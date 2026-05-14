// app/plugins/cbc/components/outcomes/SessionHeader.tsx
import { BookOpen } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { SessionStatusBadge } from '@/app/plugins/cbc/components/CBCComponents';
import type { TeachingSession, TeachingSessionSummary, OutcomeSessionWithEvidence } from '@/app/plugins/cbc/types/cbc';

interface Props {
    session: TeachingSession;
    links: OutcomeSessionWithEvidence[];
    summary?: TeachingSessionSummary;
    coveredCount: number;
    progress: number;
    withEvidenceCount: number;
}

export function SessionHeader({ session, links, summary, coveredCount, progress, withEvidenceCount }: Props) {
    return (
        <Card className="shadow-sm">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shrink-0">
                    <BookOpen className="h-7 w-7 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h1 className="text-xl font-bold text-gray-900 break-words">
                            {session.subject_name ?? 'Lesson'}
                        </h1>
                        <SessionStatusBadge status={session.status} />
                    </div>
                    <p className="text-gray-600 mb-2 break-words">{session.cohort_name}</p>
                    <p className="text-sm text-gray-500">
                        {new Date(session.session_date).toLocaleDateString('en-GB', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        })}
                    </p>
                </div>
            </div>

            {links.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-gray-600 break-words">
                            {coveredCount} of {links.length} learning goals marked taught
                        </span>
                        <span className="font-semibold text-blue-600">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {summary && (
                <div className="mt-3 flex flex-wrap gap-3">
                    <Badge variant="blue" size="sm">
                        {summary.evidence.total_records} observation record{summary.evidence.total_records !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="purple" size="sm">
                        {summary.evidence.students_with_evidence} learner{summary.evidence.students_with_evidence !== 1 ? 's' : ''} observed
                    </Badge>
                    <Badge variant="green" size="sm">
                        {withEvidenceCount}/{links.length} learning goal{links.length !== 1 ? 's' : ''} observed
                    </Badge>
                </div>
            )}
        </Card>
    );
}

// app/plugins/cbc/components/outcomes/SessionHeader.tsx
import Link from 'next/link';
import { BookOpen, Users } from 'lucide-react';
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
    const sessionId = session.id;

    return (
        <Card className="shadow-sm">
            <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shrink-0">
                    <BookOpen className="h-7 w-7 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h1 className="text-xl font-bold text-gray-900">
                            {session.subject_name ?? 'General Session'}
                        </h1>
                        <SessionStatusBadge status={session.status} />
                    </div>
                    <p className="text-gray-600 mb-2">{session.cohort_name}</p>
                    <p className="text-sm text-gray-500">
                        {new Date(session.session_date).toLocaleDateString('en-GB', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        })}
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <span className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg">
                        Outcomes
                    </span>
                    <Link
                        href={`/cbc/teaching/sessions/${sessionId}/learners`}
                        className="px-3 py-1.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <Users className="h-4 w-4" />
                        Learners
                    </Link>
                </div>
            </div>

            {links.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">
                            {coveredCount} of {links.length} outcomes covered
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
                        {summary.evidence.total_records} evidence records
                    </Badge>
                    <Badge variant="purple" size="sm">
                        {summary.evidence.students_with_evidence} students observed
                    </Badge>
                    <Badge variant="green" size="sm">
                        {withEvidenceCount}/{links.length} outcomes with evidence
                    </Badge>
                </div>
            )}
        </Card>
    );
}
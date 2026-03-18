'use client';

// ============================================================================
// app/core/components/sessions/SessionCard.tsx
//
// Reusable session row card — used in today/page.tsx and sessions/page.tsx.
// Handles ongoing, upcoming, and completed visual states.
// ============================================================================

import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { AttendanceBadge, SessionStatusBadge } from './SessionStatusBadge';
import type { Session } from '@/app/core/types/session';

type CardVariant = 'ongoing' | 'upcoming' | 'completed';

interface SessionCardProps {
    session: Session;
    variant: CardVariant;
    currentMinutes: number;
}

const variantStyles: Record<CardVariant, string> = {
    ongoing: 'bg-green-50 border-l-4 border-green-600',
    upcoming: 'bg-gray-50',
    completed: 'bg-gray-50 opacity-75',
};

export function SessionCard({ session, variant, currentMinutes }: SessionCardProps) {
    const router = useRouter();

    const handleClick = () => router.push(`/sessions/${session.id}`);

    return (
        <div
            className={`flex items-center justify-between p-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${variantStyles[variant]}`}
            onClick={handleClick}
        >
            {/* Time block */}
            <div className="text-center min-w-[80px] shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                    {session.start_time ?? '—'}
                </p>
                <p className="text-xs text-gray-500">
                    {session.end_time ?? '—'}
                </p>
            </div>

            {/* Session info */}
            <div className="flex-1 px-4 min-w-0">
                <p className="font-medium text-gray-900 truncate">{session.subject_name}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 flex-wrap">
                    <span>{session.cohort_name}</span>
                    <span>•</span>
                    <span>{session.session_type_display}</span>
                    {session.venue && (
                        <>
                            <span>•</span>
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{session.venue}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                        {session.attendance_count.present}/{session.attendance_count.total}
                    </p>
                    <AttendanceBadge counts={session.attendance_count} />
                </div>

                {variant === 'upcoming' ? (
                    <SessionStatusBadge session={session} currentMinutes={currentMinutes} />
                ) : (
                    <Button
                        variant={variant === 'ongoing' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleClick(); }}
                    >
                        {variant === 'ongoing' || session.attendance_count.unmarked > 0
                            ? 'Mark Attendance'
                            : 'View Details'
                        }
                    </Button>
                )}
            </div>
        </div>
    );
}
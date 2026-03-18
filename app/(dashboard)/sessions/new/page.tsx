'use client';

// ============================================================================
// app/(dashboard)/sessions/new/page.tsx
//
// Responsibility: render guards and compose SessionForm.
// No form logic. No API calls. No validation.
// ============================================================================

import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { SessionForm } from '@/app/core/components/sessions/SessionForm';
import { useAcademicYears } from '@/app/core/hooks/useAcademic';
import { useMemo } from 'react';

export default function CreateSessionPage() {
  const { academicYears } = useAcademicYears();

  const currentYear = useMemo(
    () => academicYears.find(y => y.is_current),
    [academicYears]
  );

  // Guard — no current academic year
  if (academicYears.length > 0 && !currentYear) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/sessions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Sessions
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Session</h1>
        </div>
        <Card>
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
            <h3 className="text-base font-semibold text-gray-900">No active academic year</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Sessions can only be created within the current academic year.
              Ask your administrator to set the current academic year before scheduling sessions.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sessions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Sessions
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">Create New Session</h1>
          <p className="text-gray-500 mt-1">
            {currentYear ? `Scheduling for ${currentYear.name}` : 'Schedule a new class session'}
          </p>
        </div>
      </div>

      <SessionForm currentYear={currentYear} />
    </div>
  );
}
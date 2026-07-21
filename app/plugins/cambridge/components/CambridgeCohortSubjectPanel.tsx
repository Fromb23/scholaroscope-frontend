'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import type { CohortSubjectPanelContext } from '@/app/core/registry/cohortSubjectPanels';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import { cohortSubjectAPI } from '@/app/plugins/cambridge/api';
import type { CambridgeCohortSubject } from '@/app/plugins/cambridge/types';

export function CambridgeCohortSubjectPanel({
  cohortId,
  isHistorical,
  onSubjectsChanged,
}: CohortSubjectPanelContext) {
  const [assignments, setAssignments] = useState<CambridgeCohortSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const rows = await cohortSubjectAPI.list({ cohort: cohortId, active: true });
      setAssignments(rows);
    } catch {
      setError('Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId]);

  const offeringId = assignments[0]?.offering_id;

  const handleUnlink = async (assignmentId: number) => {
    setWorking(true);
    setError(null);
    try {
      await cohortSubjectAPI.deactivate(assignmentId);
      await loadAssignments();
      await onSubjectsChanged?.();
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to unlink Cambridge subject.'));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 text-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">
          Linked Cambridge Subjects ({assignments.length})
        </p>

        {assignments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No Cambridge subjects assigned yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-100 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-gray-900">
                    {assignment.subject_title}
                  </span>
                  <span className="font-mono text-xs text-gray-400">
                    {assignment.subject_code}
                  </span>
                  <Badge variant="green" size="sm">
                    {assignment.programme_code}
                  </Badge>
                </div>

                {!isHistorical && (
                  <button
                    onClick={() => handleUnlink(assignment.id)}
                    disabled={working}
                    className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!isHistorical && (
        <div className="text-center py-3 space-y-2">
          <p className="text-xs text-gray-500">
            Cambridge subjects are linked to cohorts from the Cambridge offering setup.
          </p>
          {offeringId && (
            <Link
              href={`/cambridge/offerings/${offeringId}/cohorts`}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
            >
              Manage Cohort Linking →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

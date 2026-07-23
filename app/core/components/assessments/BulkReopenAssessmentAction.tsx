'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { useAdminBulkReopen } from '@/app/core/hooks/assessments/useAdminBulkReopen';

interface BulkReopenAssessmentActionProps {
  termId: number;
  termName: string;
  categoryType: string;
  categoryLabel: string;
  affectedCount: number;
  disabled?: boolean;
  disabledReason?: string | null;
  onSuccess: () => Promise<void> | void;
}

export function BulkReopenAssessmentAction({
  termId,
  termName,
  categoryType,
  categoryLabel,
  affectedCount,
  disabled = false,
  disabledReason,
  onSuccess,
}: BulkReopenAssessmentActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { bulkReopen, loading, error, result, reset } = useAdminBulkReopen({ onSuccess });

  const close = () => {
    setIsOpen(false);
    reset();
  };

  const confirm = async () => {
    try {
      await bulkReopen({
        term_id: termId,
        assessment_type: categoryType,
      });
    } catch {
      // Error state is owned by the hook and rendered in this modal.
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        title={disabledReason ?? undefined}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        <RotateCcw className="h-4 w-4" />
        Restore category for editing
      </Button>
      <Modal isOpen={isOpen} onClose={close} title="Restore assessment category" size="md">
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">Scope</p>
            <p className="mt-1 text-sm text-gray-600">
              {termName} {' › '} {categoryLabel}
            </p>
            <p className="mt-3 text-sm text-gray-700">
              This will restore {affectedCount} finalized assessment{affectedCount === 1 ? '' : 's'} for editing.
            </p>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {result ? (
            <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Restored {result.reopened_count} assessment{result.reopened_count === 1 ? '' : 's'}.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close} disabled={loading}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result ? (
              <Button type="button" onClick={confirm} disabled={loading}>
                {loading ? 'Restoring...' : 'Restore category'}
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock3,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { CurriculumDisableImpactSummary } from '@/app/core/components/curriculum/CurriculumDisableImpactSummary';
import { CurriculumLifecycleBadge } from '@/app/core/components/curriculum/CurriculumLifecycleBadge';
import { CurriculumLifecycleNotice } from '@/app/core/components/curriculum/CurriculumLifecycleNotice';
import {
  useCancelCurriculumDisableRequest,
  useCurriculumDisableImpact,
  useCurriculumDisableRequest,
  useReactivateCurriculum,
  useRequestCurriculumDisable,
  useRetryCurriculumDisableRequest,
} from '@/app/core/hooks/useCurriculumDisableWorkflow';
import { getCurriculumStatusMessage } from '@/app/core/lib/curriculumLifecycle';
import type {
  Curriculum,
  CurriculumDisableMode,
  CurriculumDisableRequestStatus,
} from '@/app/core/types/academic';

const MODE_OPTIONS: Array<{ value: CurriculumDisableMode; label: string }> = [
  { value: 'GRACEFUL', label: 'Graceful disable' },
  { value: 'FORCE', label: 'Force disable' },
];

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not recorded';
  }

  return new Date(value).toLocaleString();
}

function canCancel(status?: CurriculumDisableRequestStatus | null): boolean {
  return status === 'PENDING' || status === 'DRAINING' || status === 'WAITING_DUE_DATES';
}

function canRetry(status?: CurriculumDisableRequestStatus | null): boolean {
  return status === 'FAILED';
}

function canReactivate(curriculum?: Curriculum | null): boolean {
  return Boolean(
    curriculum
    && (
      curriculum.offering_status === 'DISABLED'
      || curriculum.offering_status === 'FAILED'
      || curriculum.offering_status === 'DRAINING'
      || curriculum.offering_status === 'DISABLE_REQUESTED'
    )
  );
}

export function CurriculumDisableWorkflowModal({
  isOpen,
  onClose,
  curriculum,
  activeRequestId = null,
  onCompleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  curriculum: Curriculum;
  activeRequestId?: number | null;
  onCompleted?: () => void;
}) {
  const [mode, setMode] = useState<CurriculumDisableMode>('GRACEFUL');
  const [localRequestId, setLocalRequestId] = useState<number | null>(activeRequestId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMode('GRACEFUL');
      setLocalRequestId(activeRequestId ?? null);
      setError(null);
      return;
    }

    setLocalRequestId(activeRequestId ?? null);
  }, [activeRequestId, isOpen]);

  const {
    data: impactResponse,
    isLoading: impactLoading,
    refetch: refetchImpact,
  } = useCurriculumDisableImpact(curriculum.id, isOpen && !localRequestId);

  useEffect(() => {
    if (impactResponse?.active_disable_request_id && !localRequestId) {
      setLocalRequestId(impactResponse.active_disable_request_id);
    }
  }, [impactResponse?.active_disable_request_id, localRequestId]);

  const {
    data: disableRequest,
    isLoading: requestLoading,
    refetch: refetchRequest,
  } = useCurriculumDisableRequest(localRequestId, isOpen && typeof localRequestId === 'number');

  const requestDisable = useRequestCurriculumDisable(curriculum.id);
  const cancelRequest = useCancelCurriculumDisableRequest(localRequestId ?? 0, curriculum.id);
  const retryRequest = useRetryCurriculumDisableRequest(localRequestId ?? 0, curriculum.id);
  const reactivateCurriculum = useReactivateCurriculum(curriculum.id);

  const impact = disableRequest?.impact_snapshot ?? impactResponse?.impact_snapshot ?? null;
  const busy = requestDisable.isPending || cancelRequest.isPending || retryRequest.isPending || reactivateCurriculum.isPending;

  const progressItems = useMemo(() => {
    if (!disableRequest) {
      return [];
    }

    return [
      { label: 'Status', value: disableRequest.status },
      { label: 'Mode', value: disableRequest.mode },
      { label: 'Requested by', value: disableRequest.requested_by_email || 'Unknown' },
      { label: 'Requested at', value: formatDateTime(disableRequest.requested_at) },
      { label: 'Confirmed at', value: formatDateTime(disableRequest.confirmed_at) },
      { label: 'Drain started', value: formatDateTime(disableRequest.drain_started_at) },
      { label: 'Finalize after', value: formatDateTime(disableRequest.finalize_after) },
      { label: 'Finalized at', value: formatDateTime(disableRequest.finalized_at) },
      {
        label: 'Admin notifications',
        value: disableRequest.admin_notification_sent_at ? 'Sent' : 'Pending',
      },
      {
        label: 'Instructor notifications',
        value: disableRequest.instructor_notifications_sent_at ? 'Sent' : 'Pending',
      },
    ];
  }, [disableRequest]);

  const handleStartWorkflow = async () => {
    setError(null);
    try {
      const response = await requestDisable.mutateAsync({
        mode,
        confirm: true,
      });
      setLocalRequestId(response.request.id);
      onCompleted?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to start disable workflow.');
    }
  };

  const handleCancel = async () => {
    setError(null);
    try {
      await cancelRequest.mutateAsync();
      onCompleted?.();
      await refetchRequest();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to cancel disable workflow.');
    }
  };

  const handleRetry = async () => {
    setError(null);
    try {
      await retryRequest.mutateAsync();
      onCompleted?.();
      await refetchRequest();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to retry disable workflow.');
    }
  };

  const handleReactivate = async () => {
    setError(null);
    try {
      await reactivateCurriculum.mutateAsync();
      onCompleted?.();
      await refetchImpact();
      if (localRequestId) {
        await refetchRequest();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to reactivate curriculum.');
    }
  };

  const renderProgress = () => {
    if (requestLoading || !disableRequest) {
      return <LoadingSpinner fullScreen={false} message="Loading workflow status..." />;
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">Disable workflow</p>
              <CurriculumLifecycleBadge status={disableRequest.curriculum_offering_status} />
            </div>
            <p className="text-sm text-gray-600">
              {getCurriculumStatusMessage(disableRequest.curriculum_offering_status, 'ADMIN')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void refetchRequest();
              }}
            >
              <RefreshCcw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
            {canCancel(disableRequest.status) ? (
              <Button type="button" variant="secondary" size="sm" onClick={handleCancel} disabled={busy}>
                <XCircle className="mr-1.5 h-4 w-4" />
                Cancel disable
              </Button>
            ) : null}
            {canRetry(disableRequest.status) ? (
              <Button type="button" size="sm" onClick={handleRetry} disabled={busy}>
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Retry
              </Button>
            ) : null}
            {canReactivate(curriculum) ? (
              <Button type="button" size="sm" onClick={handleReactivate} disabled={busy}>
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Reactivate
              </Button>
            ) : null}
          </div>
        </div>

        {disableRequest.failure_reason ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Failure reason</p>
                <p className="mt-1">{disableRequest.failure_reason}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {progressItems.map((item) => (
            <div key={item.label} className="rounded-lg border border-gray-200 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p>
              <p className="mt-1 text-sm text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>

        {impact ? (
          <CurriculumDisableImpactSummary impact={impact} />
        ) : null}

        {disableRequest.finalization_snapshot?.closure_summary || disableRequest.finalization_snapshot?.reporting ? (
          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">Finalization summary</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Closure</p>
                <p className="mt-1 text-sm text-gray-900">
                  {disableRequest.finalization_snapshot?.closure_summary?.historical_read_only
                    ? 'Historical records remain read-only.'
                    : 'Pending'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Reports</p>
                <p className="mt-1 text-sm text-gray-900">
                  {disableRequest.finalization_snapshot?.reporting?.grade_summary_count ?? 0} grade summaries,
                  {' '}
                  {disableRequest.finalization_snapshot?.reporting?.attendance_summary_count ?? 0} attendance summaries
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={localRequestId ? 'Curriculum Disable Progress' : 'Disable Curriculum'}
      size="lg"
    >
      <div className="space-y-4">
        {error ? (
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        ) : null}

        {localRequestId ? renderProgress() : (
          <>
            {impactLoading || !impact ? (
              <LoadingSpinner fullScreen={false} message="Loading disable impact..." />
            ) : (
              <>
                <CurriculumLifecycleNotice
                  status={curriculum.offering_status}
                  title="This is a lifecycle transition"
                  message="Historical data will remain readable. New work is blocked once draining starts. Existing pending work will either finish gracefully or be force-finalized. Final reports and notifications are part of this workflow."
                />

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">Choose how the disable should proceed</p>
                      <p>
                        Graceful mode waits for safe completion or the computed finalize window. Force mode moves directly toward finalization and archives or closes pending work.
                      </p>
                    </div>
                  </div>
                </div>

                <Select
                  label="Disable mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as CurriculumDisableMode)}
                  options={MODE_OPTIONS}
                />

                {impact.recommended_finalize_after ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    Recommended finalize-after window: {formatDateTime(impact.recommended_finalize_after)}
                  </div>
                ) : null}

                <CurriculumDisableImpactSummary impact={impact} />

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                  <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
                    Close
                  </Button>
                  <Button type="button" onClick={handleStartWorkflow} disabled={busy}>
                    {requestDisable.isPending ? 'Starting...' : 'Start disable workflow'}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

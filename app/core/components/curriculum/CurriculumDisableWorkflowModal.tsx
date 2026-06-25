'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { CurriculumDisableRequestStatusBadge } from '@/app/core/components/curriculum/CurriculumDisableRequestStatusBadge';
import { CurriculumLifecycleNotice } from '@/app/core/components/curriculum/CurriculumLifecycleNotice';
import {
  useCancelCurriculumDisableRequest,
  useCurriculumDisableImpact,
  useCurriculumDisableRequest,
  useReactivateCurriculum,
  useRequestCurriculumDisable,
} from '@/app/core/hooks/useCurriculumDisableWorkflow';
import {
  canStartNewDisableRequest,
  getDisableRequestStatusLabel,
  isActiveDisableRequestStatus,
} from '@/app/core/lib/curriculumDisableLifecycle';
import { getCurriculumStatusMessage } from '@/app/core/lib/curriculumLifecycle';
import type {
  Curriculum,
  CurriculumDisableMode,
  CurriculumDisableRequest,
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

function isCurriculumAvailableForDisable(curriculum?: Curriculum | null): boolean {
  return Boolean(curriculum && curriculum.is_active && curriculum.offering_status === 'ACTIVE');
}

function getRequestPanelTitle(
  request: CurriculumDisableRequest,
  canStartWorkflow: boolean,
): string {
  if (isActiveDisableRequestStatus(request.status)) {
    return 'Disable workflow in progress';
  }

  switch (request.status) {
    case 'CANCELLED':
      return 'Previous disable request cancelled';
    case 'FAILED':
      return 'Previous disable request failed';
    case 'COMPLETED':
      return canStartWorkflow ? 'Previous disable request completed' : 'Curriculum disabled';
    default:
      return 'Disable request';
  }
}

function getRequestPanelMessage(
  request: CurriculumDisableRequest,
  curriculum: Curriculum,
  canStartWorkflow: boolean,
): string {
  if (isActiveDisableRequestStatus(request.status)) {
    return 'This curriculum is currently being prepared for disable.';
  }

  switch (request.status) {
    case 'CANCELLED':
      return isCurriculumAvailableForDisable(curriculum)
        ? 'This curriculum is active. You can start a new disable request if needed.'
        : getCurriculumStatusMessage(curriculum.offering_status, 'ADMIN');
    case 'FAILED':
      return isCurriculumAvailableForDisable(curriculum)
        ? 'This curriculum is active. Review the reason, then start a new disable request if needed.'
        : getCurriculumStatusMessage(curriculum.offering_status, 'ADMIN');
    case 'COMPLETED':
      return canStartWorkflow
        ? 'This curriculum is active again. You can start a new disable request if needed.'
        : 'This curriculum is disabled. Historical records remain available in read-only form.';
    default:
      return getCurriculumStatusMessage(curriculum.offering_status, 'ADMIN');
  }
}

function getRecipientNotificationStatus(
  sent: string[] | undefined,
  errors: Array<{ email: string; error: string }> | undefined,
  attemptedAt?: string | null,
): string {
  const sentCount = sent?.length ?? 0;
  const errorCount = errors?.length ?? 0;

  if (errorCount && sentCount) {
    return 'Partial failure';
  }

  if (errorCount) {
    return 'Failed';
  }

  if (sentCount || attemptedAt) {
    return 'Sent';
  }

  return 'Skipped';
}

function getNotificationWarningTone(status?: 'SENT' | 'PARTIAL_FAILED' | 'FAILED' | 'SKIPPED') {
  if (status === 'FAILED') {
    return {
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      iconClassName: 'text-amber-600',
      title: 'Notification delivery failed',
    };
  }

  return {
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    iconClassName: 'text-amber-600',
    title: 'Notification delivery partially failed',
  };
}

export function CurriculumDisableWorkflowModal({
  isOpen,
  onClose,
  curriculum,
  latestRequestId = null,
  activeRequestId = null,
  onCompleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  curriculum: Curriculum;
  latestRequestId?: number | null;
  activeRequestId?: number | null;
  onCompleted?: () => Promise<void> | void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<CurriculumDisableMode>('GRACEFUL');
  const [displayRequestId, setDisplayRequestId] = useState<number | null>(activeRequestId ?? latestRequestId);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<{ message: string; href?: string; label?: string } | null>(null);
  const curriculumAvailableForDisable = isCurriculumAvailableForDisable(curriculum);

  useEffect(() => {
    if (!isOpen) {
      setMode('GRACEFUL');
      setDisplayRequestId(activeRequestId ?? latestRequestId ?? null);
      setError(null);
      setSuccessMessage(null);
      return;
    }

    setDisplayRequestId(activeRequestId ?? latestRequestId ?? null);
  }, [activeRequestId, isOpen, latestRequestId]);

  const canStartWorkflow = canStartNewDisableRequest({
    isEnabled: curriculumAvailableForDisable,
    activeDisableRequestStatus: activeRequestId ? 'PENDING' : null,
    latestDisableRequestStatus: null,
  });

  const {
    data: impactResponse,
    isLoading: impactLoading,
    refetch: refetchImpact,
  } = useCurriculumDisableImpact(curriculum.id, isOpen && canStartWorkflow);

  useEffect(() => {
    if (
      impactResponse?.active_disable_request_id
      && !activeRequestId
      && impactResponse.active_disable_request_id !== displayRequestId
    ) {
      setDisplayRequestId(impactResponse.active_disable_request_id);
    }
  }, [activeRequestId, displayRequestId, impactResponse?.active_disable_request_id]);

  const {
    data: disableRequest,
    isLoading: requestLoading,
    refetch: refetchRequest,
  } = useCurriculumDisableRequest(displayRequestId, isOpen && typeof displayRequestId === 'number');

  const requestDisable = useRequestCurriculumDisable(curriculum.id);
  const cancelRequest = useCancelCurriculumDisableRequest(displayRequestId ?? 0, curriculum.id);
  const reactivateCurriculum = useReactivateCurriculum(curriculum.id);

  const requestStatus = disableRequest?.status ?? null;
  const resolvedCanStartWorkflow = canStartNewDisableRequest({
    isEnabled: curriculumAvailableForDisable,
    activeDisableRequestStatus: activeRequestId ? 'PENDING' : null,
    latestDisableRequestStatus: requestStatus,
  });
  const requestImpact = disableRequest?.impact_snapshot ?? null;
  const startImpact = impactResponse?.impact_snapshot ?? null;
  const busy = requestDisable.isPending || cancelRequest.isPending || reactivateCurriculum.isPending;
  const showRequestPanel = typeof displayRequestId === 'number';
  const requestResolved = !showRequestPanel || Boolean(disableRequest);
  const requestIsActive = isActiveDisableRequestStatus(requestStatus);
  const showStartWorkflow = resolvedCanStartWorkflow && requestResolved;

  const requestDetails = useMemo(() => {
    if (!disableRequest) {
      return [];
    }

    const notifications = disableRequest.finalization_snapshot?.notifications;

    return [
      { label: 'Status', value: getDisableRequestStatusLabel(disableRequest.status) },
      { label: 'Mode', value: disableRequest.mode },
      { label: 'Requested by', value: disableRequest.requested_by_email || 'Unknown' },
      { label: 'Requested at', value: formatDateTime(disableRequest.requested_at) },
      { label: 'Confirmed at', value: formatDateTime(disableRequest.confirmed_at) },
      { label: 'Drain started', value: formatDateTime(disableRequest.drain_started_at) },
      { label: 'Finalize after', value: formatDateTime(disableRequest.finalize_after) },
      { label: 'Finalized at', value: formatDateTime(disableRequest.finalized_at) },
      { label: 'Cancelled at', value: formatDateTime(disableRequest.cancelled_at) },
      { label: 'Failed at', value: formatDateTime(disableRequest.failed_at) },
      {
        label: 'Admin notifications',
        value: getRecipientNotificationStatus(
          notifications?.admins_sent,
          notifications?.admin_errors,
          disableRequest.admin_notification_sent_at,
        ),
      },
      {
        label: 'Instructor notifications',
        value: getRecipientNotificationStatus(
          notifications?.instructors_sent,
          notifications?.instructor_errors,
          disableRequest.instructor_notifications_sent_at,
        ),
      },
    ];
  }, [disableRequest]);

  const refreshView = async ({ includeRequest = showRequestPanel }: { includeRequest?: boolean } = {}) => {
    const tasks: Array<Promise<unknown>> = [Promise.resolve(onCompleted?.()), refetchImpact()];

    if (includeRequest && typeof displayRequestId === 'number') {
      tasks.push(refetchRequest());
    }

    await Promise.all(tasks);
  };

  const handleStartWorkflow = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await requestDisable.mutateAsync({
        mode,
        confirm: true,
      });
      setDisplayRequestId(response.request.id);
      await refreshView({ includeRequest: false });
      router.refresh();
      setSuccessMessage({
        message: 'Curriculum shutdown has started. Academic setup has been refreshed.',
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to start disable workflow.');
    }
  };

  const handleCancel = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await cancelRequest.mutateAsync();
      setDisplayRequestId(response.id);
      await refreshView();
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to cancel disable workflow.');
    }
  };

  const handleReactivate = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      await reactivateCurriculum.mutateAsync();
      await refreshView();
      router.refresh();
      setSuccessMessage({
        message: `${curriculum.name} has been reactivated. Academic setup has been refreshed.`,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to reactivate curriculum.');
    }
  };

  const renderRequestPanel = () => {
    if (requestLoading || !disableRequest) {
      return <LoadingSpinner fullScreen={false} message="Loading workflow status..." />;
    }

    const panelTitle = getRequestPanelTitle(disableRequest, resolvedCanStartWorkflow);
    const panelMessage = getRequestPanelMessage(disableRequest, curriculum, resolvedCanStartWorkflow);
    const showHistoricalImpact = requestIsActive || !resolvedCanStartWorkflow;
    const notifications = disableRequest.finalization_snapshot?.notifications;
    const notificationErrors = [
      ...(notifications?.admin_errors ?? []),
      ...(notifications?.instructor_errors ?? []),
    ];
    const notificationStatus = notifications?.delivery_status;
    const notificationWarning = notificationStatus === 'FAILED' || notificationStatus === 'PARTIAL_FAILED'
      ? getNotificationWarningTone(notificationStatus)
      : null;

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">{panelTitle}</p>
              <CurriculumDisableRequestStatusBadge status={disableRequest.status} />
            </div>
            <p className="break-words text-sm text-gray-600">{panelMessage}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void refreshView();
              }}
              className="w-full sm:w-auto"
            >
              <RefreshCcw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
            {requestIsActive && canCancel(disableRequest.status) ? (
              <Button type="button" variant="secondary" size="sm" onClick={handleCancel} disabled={busy} className="w-full sm:w-auto">
                <XCircle className="mr-1.5 h-4 w-4" />
                Cancel disable
              </Button>
            ) : null}
            {!resolvedCanStartWorkflow && canReactivate(curriculum) ? (
              <Button type="button" size="sm" onClick={handleReactivate} disabled={busy} className="w-full sm:w-auto">
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
                <p className="mt-1 break-words">{disableRequest.failure_reason}</p>
              </div>
            </div>
          </div>
        ) : null}

        {notificationWarning ? (
          <div className={`rounded-lg border p-3 text-sm ${notificationWarning.className}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${notificationWarning.iconClassName}`} />
              <div className="min-w-0 space-y-2">
                <div>
                  <p className="font-medium">{notificationWarning.title}</p>
                  <p className="mt-1 break-words">
                    Curriculum disable still completed. Review the affected recipients below.
                  </p>
                </div>
                <div className="space-y-1">
                  {notificationErrors.map((entry) => (
                    <p key={`${entry.email}:${entry.error}`} className="break-words text-xs">
                      <span className="font-medium">{entry.email}</span>: {entry.error}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {requestDetails.map((item) => (
            <div key={item.label} className="rounded-lg border border-gray-200 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p>
              <p className="mt-1 break-words text-sm text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>

        {showHistoricalImpact && requestImpact ? (
          <CurriculumDisableImpactSummary impact={requestImpact} />
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
                <p className="mt-1 break-words text-sm text-gray-900">
                  {disableRequest.finalization_snapshot?.closure_summary?.historical_read_only
                    ? 'Historical records remain read-only.'
                    : 'Pending'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Reports</p>
                <p className="mt-1 break-words text-sm text-gray-900">
                  {disableRequest.finalization_snapshot?.reporting?.grade_summary_count ?? 0} grade summaries,
                  {' '}
                  {disableRequest.finalization_snapshot?.reporting?.attendance_summary_count ?? 0} attendance summaries
                </p>
              </div>
              {notifications ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 md:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Notifications</p>
                  <p className="mt-1 break-words text-sm text-gray-900">
                    Delivery status: {notifications.delivery_status ?? 'SKIPPED'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderStartWorkflow = () => {
    if (impactLoading || !startImpact) {
      return <LoadingSpinner fullScreen={false} message="Loading disable impact..." />;
    }

    return (
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

        {startImpact.recommended_finalize_after ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Recommended finalize-after window: {formatDateTime(startImpact.recommended_finalize_after)}
          </div>
        ) : null}

        <CurriculumDisableImpactSummary impact={startImpact} />

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy} className="w-full sm:w-auto">
            Close
          </Button>
          <Button type="button" onClick={handleStartWorkflow} disabled={busy} className="w-full sm:w-auto">
            {requestDisable.isPending
              ? 'Starting...'
              : disableRequest
                ? 'Start new disable request'
                : 'Disable curriculum'}
          </Button>
        </div>
      </>
    );
  };

  const renderUnavailableState = () => (
    <div className="space-y-4">
      <CurriculumLifecycleNotice
        status={curriculum.offering_status}
        role="ADMIN"
      />

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose} disabled={busy} className="w-full sm:w-auto">
          Close
        </Button>
        {canReactivate(curriculum) ? (
          <Button type="button" onClick={handleReactivate} disabled={busy} className="w-full sm:w-auto">
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reactivate
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeRequestId || requestIsActive ? 'Curriculum Disable Progress' : 'Disable Curriculum'}
      size="lg"
    >
      <div className="space-y-4">
        {error ? (
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        ) : null}

        {successMessage ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">{successMessage.message}</p>
              {successMessage.href && successMessage.label ? (
                <Link href={successMessage.href}>
                  <Button type="button" size="sm" variant="secondary">
                    {successMessage.label}
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {showRequestPanel ? renderRequestPanel() : null}
        {showStartWorkflow ? renderStartWorkflow() : null}
        {!showRequestPanel && !showStartWorkflow ? renderUnavailableState() : null}
      </div>
    </Modal>
  );
}

import { apiClient } from '@/app/core/api/client';

export type TimetableEntry = {
  id: number;
  external_entry_uuid: string | null;
  external_logical_entry_uuid: string;
  teacher_id: number | null;
  teacher_name: string;
  cohort_id: number | null;
  cohort_name: string;
  subject_id: number | null;
  subject_name: string;
  subject_code: string;
  room_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  starts_on: string | null;
  ends_on: string | null;
};

export type TimetableProjection = {
  id: number;
  type: 'LEARNING' | 'EXAMINATION';
  workspace_name: string;
  version_uuid: string;
  timetable_uuid: string;
  version_label: string;
  academic_year_label: string;
  term_label: string;
  effective_from: string | null;
  effective_until: string | null;
  published_at: string | null;
  publication_reason: string;
  publication_diff: unknown[];
};

export type TimetableProjectionResponse = {
  status: 'PUBLISHED' | 'NO_PUBLISHED_TIMETABLE';
  projection: TimetableProjection | null;
  entries: TimetableEntry[];
  printable: boolean;
  generated_at?: string;
};

export type TimetableChange = {
  classification: string;
  detail: Record<string, unknown>;
  created_at: string;
};

export type TimetableIntegrationStatus = {
  plugin: {
    enabled: boolean;
    installation_id: number;
    installation_active: boolean;
  };
  integration: {
    provisioning_state: string;
    health: string;
    ready: boolean;
    external_workspace_uuid: string | null;
    last_successful_sync_at: string | null;
    reconciliation_required: boolean;
  };
};

type LaunchAction = {
  method: 'POST';
  url: string;
  body: Record<string, unknown>;
  body_json: string;
  headers: Record<string, string>;
  expires_at: string;
  correlation_id: string;
};

export async function getOwnTimetable(printable = false): Promise<TimetableProjectionResponse> {
  const path = printable
    ? '/plugins/timetable/projections/own/print/'
    : '/plugins/timetable/projections/own/';
  const response = await apiClient.get<TimetableProjectionResponse>(path);
  return response.data;
}

export async function getOwnTimetableChanges(): Promise<{ changes: TimetableChange[] }> {
  const response = await apiClient.get<{ changes: TimetableChange[] }>(
    '/plugins/timetable/projections/own/changes/',
  );
  return response.data;
}

export async function getWorkspaceTimetable(params?: URLSearchParams, printable = false): Promise<TimetableProjectionResponse> {
  const path = printable
    ? '/plugins/timetable/projections/workspace/print/'
    : '/plugins/timetable/projections/workspace/';
  const response = await apiClient.get<TimetableProjectionResponse>(path, {
    params: Object.fromEntries(params?.entries() ?? []),
  });
  return response.data;
}

export async function getTimetableIntegrationStatus(): Promise<TimetableIntegrationStatus> {
  const response = await apiClient.get<TimetableIntegrationStatus>(
    '/plugins/timetable/integration/status/',
  );
  return response.data;
}

export async function refreshTimetableAcademicData(): Promise<{
  status: 'SYNCHRONIZATION_PENDING';
  message: string;
  last_successful_sync_at: string | null;
}> {
  const response = await apiClient.post<{
    status: 'SYNCHRONIZATION_PENDING';
    message: string;
    last_successful_sync_at: string | null;
  }>('/plugins/timetable/integration/refresh/');
  return response.data;
}

export async function launchTimetablePortal(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Timetable portal can only be launched from a browser.');
  }

  const pendingWindow = window.open('about:blank', '_blank');
  if (!pendingWindow) {
    throw new Error('The browser blocked the timetable portal tab. Allow pop-ups for Scholaroscope and try again.');
  }

  const closePendingWindow = () => {
    if (!pendingWindow.closed) {
      pendingWindow.close();
    }
  };

  try {
    pendingWindow.opener = null;
  } catch {
    closePendingWindow();
    throw new Error('Timetable portal tab could not be isolated. Try again.');
  }

  let launchAction: LaunchAction;
  try {
    const response = await apiClient.post<{ launch_action: LaunchAction }>(
      '/plugins/timetable/launch/',
    );
    launchAction = response.data.launch_action;
  } catch {
    closePendingWindow();
    throw new Error('Timetable portal launch could not be prepared. Try again.');
  }

  let exchange: Response;
  try {
    exchange = await fetch(launchAction.url, {
      method: launchAction.method,
      headers: launchAction.headers,
      body: launchAction.body_json,
      credentials: 'include',
    });
  } catch {
    closePendingWindow();
    throw new Error('Timetable portal launch exchange failed. Check your connection and try again.');
  }

  if (!exchange.ok) {
    closePendingWindow();
    throw new Error('Timetable portal launch was rejected.');
  }

  try {
    pendingWindow.location.replace(new URL(launchAction.url).origin);
  } catch {
    closePendingWindow();
    throw new Error('Timetable portal tab could not be redirected. Try again.');
  }
}

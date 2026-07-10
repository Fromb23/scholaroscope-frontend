const FIELD_LABELS: Record<string, string> = {
  email: 'Email address',
  first_name: 'First name',
  last_name: 'Last name',
  password: 'Password',
  password2: 'Confirm password',
  workspace_name: 'Workspace name',
  org_type: 'Workspace type',
  invite_code: 'Invite code',
  quote_token: 'Quote',
  title: 'Title',
  name: 'Name',
  venue: 'Venue',
  description: 'Description',
  term: 'Term',
  academic_year: 'Academic year',
  cohort: 'Class',
  cohort_subject: 'Class subject',
  subject: 'Subject',
  learner: 'Learner',
  instructor: 'Instructor',
  admission_number: 'Admission number',
  numeric_score: 'Score',
  assessment: 'Assessment',
  assessment_weights: 'Assessment weights',
  assignment: 'Assignment',
  level_scale: 'Level scale',
  scope: 'Scope',
  subject_profile: 'Subject profile',
  cbc_cohort_subject: 'CBC class subject',
  due_date: 'Due date',
  starts_at: 'Start time',
  ends_at: 'End time',
  detail: 'Details',
};

const SAFE_FIELD_KEYS = new Set(Object.keys(FIELD_LABELS));

const NON_FIELD_KEYS = new Set([
  'non_field_errors',
  'detail',
  'message',
  'error',
  'code',
  'type',
  'status',
  'next_action',
  'support_code',
  'supportCode',
  'field_errors',
  'fieldErrors',
  'request_id',
  'trace_id',
  'context',
  'requires_attendance',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeMessages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeMessages(item))
      .filter(Boolean);
  }
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') {
    const nested = value as Record<string, unknown>;
    if (typeof nested.message === 'string') return [nested.message];
    if (typeof nested.detail === 'string') return [nested.detail];
  }
  return [];
}

export function extractFieldErrors(data: unknown): Record<string, string[]> {
  if (!isRecord(data)) return {};

  const result: Record<string, string[]> = {};

  const addFields = (source: unknown) => {
    if (!isRecord(source)) return;
    for (const [field, value] of Object.entries(source)) {
      if (NON_FIELD_KEYS.has(field)) continue;
      if (!SAFE_FIELD_KEYS.has(field)) continue;
      const messages = normalizeMessages(value);
      if (messages.length > 0) {
        result[field] = [...(result[field] ?? []), ...messages];
      }
    }
  };

  addFields(data);

  if (isRecord(data.error)) {
    addFields(data.error.field_errors);
    addFields(data.error.fieldErrors);
  }

  addFields(data.field_errors);
  addFields(data.fieldErrors);

  return result;
}

export function formatFieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return field
    .replace(/_id$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function fieldErrorsToSummary(fieldErrors: Record<string, string[]>): string {
  return Object.entries(fieldErrors)
    .flatMap(([field, messages]) => messages.map((message) => `${formatFieldLabel(field)}: ${message}`))
    .join('\n');
}

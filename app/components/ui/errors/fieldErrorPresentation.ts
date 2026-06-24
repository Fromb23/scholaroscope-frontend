const FIELD_LABELS: Record<string, string> = {
  email: 'Email address',
  first_name: 'First name',
  last_name: 'Last name',
  password: 'Password',
  password2: 'Confirm password',
  workspace_name: 'Workspace name',
  non_field_errors: 'Form',
  detail: 'Details',
};

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

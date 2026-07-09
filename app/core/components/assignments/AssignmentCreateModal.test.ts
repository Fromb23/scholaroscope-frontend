import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/assignments/AssignmentCreateModal.tsx'),
  'utf8',
);

describe('AssignmentCreateModal attachment slots', () => {
  it('offers attachment requirements as teacher-facing options', () => {
    const modalSource = source();

    expect(modalSource).toContain('Learners need to attach files or evidence');
    expect(modalSource).toContain('Photos/images');
    expect(modalSource).toContain('PDF/document');
    expect(modalSource).toContain('Portfolio/artifact');
  });

  it('serializes attachment policy and slots in create/update payloads', () => {
    const modalSource = source();

    expect(modalSource).toContain('requires_attachments: requiresAttachments');
    expect(modalSource).toContain('attachment_policy: requiresAttachments');
    expect(modalSource).toContain('attachment_slots: requiresAttachments ? buildAttachmentSlots');
    expect(modalSource).toContain('Select at least one attachment or evidence type.');
  });

  it('uses the responsive modal sheet footer for active assignment state', () => {
    const modalSource = source();

    expect(modalSource).toContain('closeDisabled={saving}');
    expect(modalSource).toContain('footer={');
    expect(modalSource).toContain('<ActionStateBanner');
    expect(modalSource).toContain('submitDisabledReason');
    expect(modalSource).toContain("disabled={saving || Boolean(submitDisabledReason)}");
  });

  it('uses report-policy capability access instead of raw workspace role checks', () => {
    const modalSource = source();

    expect(modalSource).not.toContain("activeRole === 'ADMIN'");
    expect(modalSource).toContain('canManageReportPolicyAuthoring');
    expect(modalSource).toContain('getReportPolicyAuthoringMode');
    expect(modalSource).toContain('const { user, capabilities } = useAuth()');
    expect(modalSource).toContain('canManageReportPolicySetup');
  });
});

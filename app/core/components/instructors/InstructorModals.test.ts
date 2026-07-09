import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const modalsSource = readFileSync(
  join(process.cwd(), 'app/core/components/instructors/InstructorModals.tsx'),
  'utf8',
);
const progressPageSource = readFileSync(
  join(process.cwd(), 'app/core/components/admin/instructors/InstructorProgressPage.tsx'),
  'utf8',
);

describe('Instructor foreground modals', () => {
  it('uses sticky Modal footers and explicit backdrop protection for action modals', () => {
    expect(modalsSource.match(/closeDisabled=\{submitting\}/g)?.length).toBeGreaterThanOrEqual(3);
    expect(modalsSource).toContain('closeDisabled={working}');
    expect(modalsSource.match(/closeOnBackdrop=\{false\}/g)?.length).toBeGreaterThanOrEqual(4);
    expect(modalsSource.match(/footer=\{/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps reset password validation and success state inside the sheet', () => {
    expect(modalsSource).toContain("setErr('Minimum 8 characters')");
    expect(modalsSource).toContain("setErr('Passwords do not match')");
    expect(modalsSource).toContain("setSuccessMessage('Password reset successfully.')");
    expect(modalsSource).toContain('title="Password reset"');
    expect(progressPageSource).not.toContain('setResetOpen(false);');
    expect(progressPageSource).not.toContain('Password reset successfully\', \'Failed to reset password');
  });

  it('keeps teaching assignment errors, success, and close action in the sheet', () => {
    expect(modalsSource).toContain('title="Teaching assignment failed"');
    expect(modalsSource).toContain('title="Teaching assignment updated"');
    expect(modalsSource).toContain('setSuccessMessage(`${subject.subject_name} assigned to ${instructorName}.`)');
    expect(modalsSource).toContain('setSuccessMessage(`${assignment.subjectName} unassigned from ${instructorName}.`)');
    expect(modalsSource).toContain('<Button variant="secondary" onClick={handleClose} disabled={working}>Close</Button>');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('SchemesPage supervision rules', () => {
  it('keeps institutional admins in supervision mode without draft creation', () => {
    const source = readFileSync(join(process.cwd(), 'app/plugins/schemes/components/SchemesPage.tsx'), 'utf8');

    expect(source).toContain('Schemes of Work Supervision');
    expect(source).toContain('isInstitutionalAdminSupervisor');
    expect(source).toContain('showCreateDraft');
    expect(source).toContain('Instructor progress');
    expect(source).toContain('/admin/instructors/${scheme.teacher}/progress');
  });
});

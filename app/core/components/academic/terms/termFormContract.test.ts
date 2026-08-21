import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveAppError } from '@/app/core/errors';

const formSource = readFileSync(join(process.cwd(), 'app/core/components/academic/TermComponents.tsx'), 'utf8');
const pageSource = readFileSync(join(process.cwd(), 'app/core/components/academic/terms/TermsPage.tsx'), 'utf8');

describe('term form production contract', () => {
  it('keeps sequence completely out of create and edit form state and UI', () => {
    expect(formSource).not.toContain('sequence');
    const initialDataBlock = pageSource.slice(pageSource.indexOf('const initialData'), pageSource.indexOf('const selectedTermCalendarBadge'));
    expect(initialDataBlock).not.toContain('sequence');
  });

  it('mounts one form modal and synchronously guards duplicate submissions', () => {
    expect(pageSource.match(/<TermFormModal/g)).toHaveLength(1);
    expect(formSource).toContain('if (submittingRef.current) return;');
    expect(formSource).toContain('submittingRef.current = true;');
  });

  it('retains field-specific backend validation through the shared error architecture', () => {
    const resolved = resolveAppError({
      response: {
        status: 400,
        data: {
          start_date: ['Start date cannot be before the academic year starts on 2027-01-01.'],
          end_date: ['End date cannot be after the academic year ends on 2027-12-31.'],
          non_field_errors: ['Term dates must fall within the selected academic year.'],
        },
      },
    }, { domain: 'academic_setup', action: 'create', entityLabel: 'term' });

    expect(resolved.kind).toBe('validation');
    expect(resolved.fieldErrors?.start_date?.[0]).toContain('2027-01-01');
    expect(resolved.fieldErrors?.end_date?.[0]).toContain('2027-12-31');
    expect(formSource).toContain('error={fieldError(\'start_date\')}');
    expect(formSource).toContain('error={fieldError(\'end_date\')}');
  });
});

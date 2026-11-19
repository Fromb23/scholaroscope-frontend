import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
    return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('academic year deletion contract', () => {
    it('uses server eligibility and a fresh impact preview for actions and confirmation', () => {
        const page = source('app/core/components/academic/years/AcademicYearsPage.tsx');
        const api = source('app/core/api/academic.ts');
        const types = source('app/core/types/academic.ts');

        expect(types).toContain('deletion: AcademicSetupDeletionImpact');
        expect(api).toContain('/academic-years/${id}/deletion-impact/');
        expect(page).toContain('year.deletion.eligible');
        expect(page).toContain('year.deletion.reason');
        expect(page).toContain('academicYearAPI.getDeletionImpact(year.id)');
        expect(page).toContain('impact.removes');
        expect(page).toContain('This cannot be undone.');
    });
});

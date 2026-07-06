import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('mobile cohort UI architecture', () => {
  it('passes the mobile cohort UI checker', () => {
    expect(() => {
      execFileSync(process.execPath, ['tools/check-mobile-cohort.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('keeps cohort mobile views CSS-switched and action grouping sourced centrally', () => {
    const adminCohorts = read('app/core/components/academic/cohorts/AdminCohortsPageContent.tsx');
    const classActionsMobile = read('app/core/components/cohorts/ClassActionsMobile.tsx');

    expect(adminCohorts).toContain('md:hidden');
    expect(adminCohorts).toContain('hidden md:block');
    expect(classActionsMobile).toContain('splitCohortSubjectMobileActions');
    expect(classActionsMobile).not.toContain('Prepare lesson');
  });
});

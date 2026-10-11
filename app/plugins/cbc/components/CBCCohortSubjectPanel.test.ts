import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  join(process.cwd(), 'app/plugins/cbc/components/CBCCohortSubjectPanel.tsx'),
  'utf8',
);

describe('CBC senior cohort subject boundary', () => {
  it('renders only core and pathway-authorized organization offerings', () => {
    expect(panelSource).toContain('snapshot.core.map');
    expect(panelSource).toContain('snapshot.pathway_allowed_subjects.map');
    expect(panelSource).not.toContain('snapshot.blocked.map');
  });

  it('keeps curriculum import in the organization catalogue', () => {
    expect(panelSource).not.toContain('requestCurriculumImport');
    expect(panelSource).not.toContain('Request curriculum import');
    expect(panelSource).toContain('Open subject catalogue');
  });
});

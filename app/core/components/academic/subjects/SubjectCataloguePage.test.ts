import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  compareCatalogItemsByPriority,
  isCurriculumImportRequested,
  matchesCatalogSearch,
} from './subjectCatalogUtils';
import type { SubjectCatalogItem } from '@/app/core/types/academic';

function catalogItem(overrides: Partial<SubjectCatalogItem>): SubjectCatalogItem {
  return {
    id: 'item',
    source: 'cbc',
    curriculum: 1,
    catalog_subject_id: 'profile-1',
    code: 'X',
    name: 'Subject',
    level: 'grade10',
    description: '',
    offered: false,
    offering_id: null,
    cohort_assignment_count: 0,
    status: 'AVAILABLE',
    metadata: { is_content_ready: true },
    ...overrides,
  };
}

describe('SubjectCataloguePage toast channel', () => {
  it('uses the shared toast provider instead of local toast state', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/academic/subjects/SubjectCataloguePage.tsx'),
      'utf8',
    );

    expect(source).toContain('useToast');
    expect(source).toContain('showToast');
    expect(source).not.toContain('toastMessage');
    expect(source).not.toContain('setToastMessage');
  });
});

describe('SubjectCataloguePage priority and request workflow', () => {
  it('orders offered subjects before ready subjects and ready subjects before unseeded subjects deterministically', () => {
    const offered = catalogItem({ id: 'offered', name: 'Biology', status: 'OFFERED' });
    const ready = catalogItem({ id: 'ready', name: 'Chemistry', metadata: { is_content_ready: true } });
    const unseeded = catalogItem({ id: 'unseeded', name: 'Agriculture', metadata: { is_content_ready: false } });
    const otherUnseeded = catalogItem({ id: 'other-unseeded', name: 'Art', metadata: { is_content_ready: false } });

    const rows = [unseeded, ready, otherUnseeded, offered].sort(compareCatalogItemsByPriority);

    expect(rows.map((row) => row.id)).toEqual(['offered', 'ready', 'unseeded', 'other-unseeded']);
  });

  it('preserves existing catalogue search matching', () => {
    const item = catalogItem({ name: 'Kiswahili', code: 'KIS', level: 'grade10' });

    expect(matchesCatalogSearch(item, 'kis')).toBe(true);
    expect(matchesCatalogSearch(item, 'Grade 10')).toBe(true);
    expect(matchesCatalogSearch(item, 'biology')).toBe(false);
  });

  it('wires the existing curriculum import button to request and sent states', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/academic/subjects/SubjectCataloguePage.tsx'),
      'utf8',
    );

    expect(source).toContain('Request curriculum import');
    expect(source).toContain('requestCurriculumImport');
    expect(source).toContain('canRequestCurriculumImport');
    expect(source).toContain('curriculum.import.request');
    expect(source).toContain('Import requested');
    expect(source).toContain('compareCatalogItemsByPriority');
    expect(isCurriculumImportRequested(catalogItem({
      metadata: { is_content_ready: false, curriculum_import_requested: true },
    }))).toBe(true);
  });
});

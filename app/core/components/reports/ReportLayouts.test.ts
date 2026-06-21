import { describe, expect, it } from 'vitest';
import { shouldUseSplitReportLayout } from './ReportLayouts';

describe('report layout helpers', () => {
  it('uses split layout only when both sides have content', () => {
    expect(shouldUseSplitReportLayout(2, true)).toBe(true);
    expect(shouldUseSplitReportLayout(0, true)).toBe(false);
    expect(shouldUseSplitReportLayout(2, false)).toBe(false);
  });
});

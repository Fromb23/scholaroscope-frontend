import { afterEach, describe, expect, it, vi } from 'vitest';
import { createExportPayload, exportData, exportToPDF } from './exportUtils';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubPrintWindow() {
  const openedDocument = { open: vi.fn(), write: vi.fn(), close: vi.fn() };
  const open = vi.fn().mockReturnValue({
    document: openedDocument,
    focus: vi.fn(),
  });
  vi.stubGlobal('window', { open });
  return { open, openedDocument };
}

describe('export utilities', () => {
  it('dispatches pdf exports', () => {
    const { open, openedDocument } = stubPrintWindow();

    exportData(createExportPayload('PDF Test', [{ key: 'name', label: 'Name' }], [{ name: 'Ada' }]), 'pdf');

    expect(open).toHaveBeenCalled();
    expect(openedDocument.write).toHaveBeenCalledWith(expect.stringContaining('PDF Test'));
    expect(openedDocument.write).toHaveBeenCalledWith(expect.stringContaining('Ada'));
  });

  it('prints metadata and table headers in printable PDF output', () => {
    const { openedDocument } = stubPrintWindow();

    exportToPDF(createExportPayload(
      'Class Report',
      [{ key: 'score', label: 'Score', align: 'right', format: 'percentage' }],
      [{ score: 83.4 }],
      { subtitle: 'Term 1', metadata: { cohort: 'Grade 7' }, orientation: 'portrait' },
    ));

    const html = String(openedDocument.write.mock.calls[0][0]);
    expect(html).toContain('Class Report');
    expect(html).toContain('Term 1');
    expect(html).toContain('Grade 7');
    expect(html).toContain('Score');
    expect(html).toContain('83.4%');
    expect(html).toContain('@page { size: A4 portrait;');
  });
});

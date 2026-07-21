import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactMocks = vi.hoisted(() => ({
  setExporting: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({
  showToast: vi.fn(),
}));
const downloadMocks = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useCallback: (callback: unknown) => callback,
    useRef: (initialValue: unknown) => ({ current: initialValue }),
    useState: () => [false, reactMocks.setExporting],
  };
});

vi.mock('@/app/components/ui/toast/useToast', () => ({
  useToast: () => ({ showToast: toastMocks.showToast }),
}));

vi.mock('@/app/core/api/downloads', () => ({
  downloadBlob: downloadMocks.downloadBlob,
}));

import { useReportExport } from './useReportExport';

describe('useReportExport', () => {
  beforeEach(() => {
    reactMocks.setExporting.mockReset();
    toastMocks.showToast.mockReset();
    downloadMocks.downloadBlob.mockReset();
  });

  it('calls downloadBlob on successful export', async () => {
    const blob = new Blob(['report']);
    const exportFn = vi.fn(async () => ({
      blob,
      fileName: 'report.pdf',
    }));
    const { handleExport } = useReportExport(exportFn, 'report');

    await handleExport('pdf');

    expect(exportFn).toHaveBeenCalledWith('pdf');
    expect(downloadMocks.downloadBlob).toHaveBeenCalledWith(blob, 'report.pdf');
    expect(toastMocks.showToast).not.toHaveBeenCalled();
  });

  it('shows a toast on export failure and does not throw', async () => {
    const exportFn = vi.fn(async () => {
      throw new Error('network');
    });
    const { handleExport } = useReportExport(exportFn, 'attendance report');

    await expect(handleExport('pdf')).resolves.toBeUndefined();

    expect(downloadMocks.downloadBlob).not.toHaveBeenCalled();
    expect(toastMocks.showToast).toHaveBeenCalledWith({
      severity: 'error',
      message: 'Could not export attendance report. Try again.',
    });
  });

  it('does not show arbitrary server validation content on export failure', async () => {
    const exportFn = vi.fn(async () => {
      throw {
        response: {
          data: {
            format: "Unsupported export format 'xlsx' for report type 'learner_term_progress'.",
          },
        },
      };
    });
    const { handleExport } = useReportExport(exportFn, 'learner progress report');

    await handleExport('xlsx');

    expect(toastMocks.showToast).toHaveBeenCalledWith({
      severity: 'error',
      message: 'Could not export learner progress report. Try again.',
    });
  });

  it('sets exporting true during export and false after success', async () => {
    let resolveExport: (value: { blob: Blob; fileName: string }) => void = () => {};
    const exportPromise = new Promise<{ blob: Blob; fileName: string }>((resolve) => {
      resolveExport = resolve;
    });
    const { handleExport } = useReportExport(() => exportPromise, 'report');

    const pending = handleExport('xlsx');
    expect(reactMocks.setExporting).toHaveBeenCalledWith(true);

    resolveExport({ blob: new Blob(['report']), fileName: 'report.xlsx' });
    await pending;

    expect(reactMocks.setExporting.mock.calls.at(-1)).toEqual([false]);
  });

  it('returns exporting to false even on error', async () => {
    const { handleExport } = useReportExport(async () => {
      throw new Error('network');
    }, 'report');

    await handleExport('pdf');

    expect(reactMocks.setExporting).toHaveBeenNthCalledWith(1, true);
    expect(reactMocks.setExporting.mock.calls.at(-1)).toEqual([false]);
  });
});

'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/app/components/ui/toast/useToast';
import { downloadBlob } from '@/app/core/api/downloads';
import type { ReportExportFormat } from '@/app/core/types/reporting';

type ExportFn = (format: ReportExportFormat) => Promise<{ blob: Blob; fileName: string }>;

export function useReportExport(exportFn: ExportFn, label: string) {
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    setExporting(true);
    try {
      const file = await exportFn(format);
      downloadBlob(file.blob, file.fileName);
    } catch {
      showToast({
        severity: 'error',
        message: `Could not export ${label}. Try again.`,
      });
    } finally {
      setExporting(false);
    }
  }, [exportFn, label, showToast]);

  return { handleExport, exporting };
}

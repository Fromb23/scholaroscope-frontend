'use client';

import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/app/components/ui/toast/useToast';
import { downloadBlob } from '@/app/core/api/downloads';
import { resolveErrorMessage, type ApiError } from '@/app/core/types/errors';
import type { ReportExportFormat } from '@/app/core/types/reporting';

type ExportFn = (format: ReportExportFormat) => Promise<{ blob: Blob; fileName: string }>;

export function useReportExport(exportFn: ExportFn, label: string) {
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();
  const inFlightRef = useRef(false);

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setExporting(true);
    try {
      const file = await exportFn(format);
      downloadBlob(file.blob, file.fileName);
    } catch (error) {
      const fallbackMessage = `Could not export ${label}. Try again.`;
      const apiError = error as ApiError;
      showToast({
        severity: 'error',
        message: apiError.response?.data
          ? resolveErrorMessage(apiError, fallbackMessage)
          : fallbackMessage,
      });
    } finally {
      setExporting(false);
      inFlightRef.current = false;
    }
  }, [exportFn, label, showToast]);

  return { handleExport, exporting };
}

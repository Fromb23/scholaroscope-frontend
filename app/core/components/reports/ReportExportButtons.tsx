'use client';

import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { ButtonPendingContent } from '@/app/components/ui/loading';
import {
  allowedReportExportFormats,
  type ReportExportType,
} from '@/app/core/reportExportPolicy';
import type { ReportExportFormat } from '@/app/core/types/reporting';

const FORMAT_LABELS: Record<ReportExportFormat, string> = {
  pdf: 'Export PDF',
  xlsx: 'Export Excel',
  docx: 'Download Word document',
};

const FORMAT_PENDING_LABELS: Record<ReportExportFormat, string> = {
  pdf: 'Preparing PDF...',
  xlsx: 'Preparing Excel...',
  docx: 'Preparing Word document...',
};

const FORMAT_ICONS = {
  pdf: FileText,
  xlsx: FileSpreadsheet,
  docx: Download,
} as const;

interface ReportExportButtonsProps {
  reportType: ReportExportType;
  exporting: boolean;
  disabled?: boolean;
  onExport: (format: ReportExportFormat) => void | Promise<void>;
  className?: string;
  labels?: Partial<Record<ReportExportFormat, string>>;
}

export function ReportExportButtons({
  reportType,
  exporting,
  disabled = false,
  onExport,
  className = '',
  labels = {},
}: ReportExportButtonsProps) {
  const formats = allowedReportExportFormats(reportType);
  if (formats.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {formats.map((format) => {
        const Icon = FORMAT_ICONS[format];
        return (
          <Button
            key={format}
            variant="secondary"
            size="sm"
            disabled={disabled || exporting}
            onClick={() => void onExport(format)}
          >
            <ButtonPendingContent pending={exporting} pendingLabel={FORMAT_PENDING_LABELS[format]}>
              <Icon className="h-4 w-4" />
              {labels[format] ?? FORMAT_LABELS[format]}
            </ButtonPendingContent>
          </Button>
        );
      })}
    </div>
  );
}

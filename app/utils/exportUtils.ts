// ============================================================================
// utils/exportUtils.ts
// Export utilities - Handles Excel, CSV, and printable PDF generation
// ============================================================================

import * as XLSX from 'xlsx';
import type { ExportPayload, ExportFormat, ExportColumn } from '@/app/types/export';

// ============================================================================
// Helper Functions
// ============================================================================

const formatValue = (value: unknown, format?: ExportColumn['format']): string => {
    if (value === null || value === undefined || value === '') return '';

    switch (format) {
        case 'date':
            return new Date(String(value)).toLocaleDateString();
        case 'number':
            return Number(value).toLocaleString();
        case 'percentage':
            return `${Number(value).toFixed(1)}%`;
        case 'currency':
            return `KES ${Number(value).toLocaleString()}`;
        default:
            return String(value);
    }
};

const generateFileName = (payload: ExportPayload, extension: string): string => {
    let fileName = payload.fileName || payload.title;

    if (payload.includeTimestamp) {
        const timestamp = new Date().toISOString().split('T')[0];
        fileName = `${fileName}_${timestamp}`;
    }

    return `${fileName}.${extension}`;
};

const escapeHtml = (value: unknown): string => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// ============================================================================
// Excel Export
// ============================================================================

export const exportToExcel = (payload: ExportPayload): void => {
    const workbook = XLSX.utils.book_new();
    const sheetData: unknown[][] = [];

    // Add title
    sheetData.push([payload.title]);
    if (payload.subtitle) {
        sheetData.push([payload.subtitle]);
    }
    sheetData.push([]); // Empty row

    // Add metadata if enabled
    if (payload.includeMetadata && payload.metadata) {
        Object.entries(payload.metadata).forEach(([key, value]) => {
            if (value) {
                sheetData.push([key.replace(/([A-Z])/g, ' $1').trim(), value]);
            }
        });
        sheetData.push([]); // Empty row
    }

    // Add headers
    const headers = payload.columns.map(col => col.label);
    sheetData.push(headers);

    // Add data rows
    payload.rows.forEach(row => {
        const cells = row as Record<string, unknown>;
        const rowData = payload.columns.map(col =>
            formatValue(cells[col.key], col.format)
        );
        sheetData.push(rowData);
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    const columnWidths = payload.columns.map(col => ({
        wch: col.width || 15
    }));
    worksheet['!cols'] = columnWidths;

    // Freeze header row if enabled
    if (payload.freezeHeader) {
        const headerRowIndex = sheetData.findIndex(row =>
            row.length === headers.length && row[0] === headers[0]
        );
        worksheet['!freeze'] = { xSplit: 0, ySplit: headerRowIndex + 1 };
    }

    // Add autofilter if enabled
    if (payload.autoFilter) {
        const headerRowIndex = sheetData.findIndex(row =>
            row.length === headers.length && row[0] === headers[0]
        );
        const range = {
            s: { r: headerRowIndex, c: 0 },
            e: { r: sheetData.length - 1, c: headers.length - 1 }
        };
        worksheet['!autofilter'] = {
            ref: XLSX.utils.encode_range(range)
        };
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        payload.sheetName || 'Data'
    );

    // Save file
    XLSX.writeFile(workbook, generateFileName(payload, 'xlsx'));
};

// ============================================================================
// CSV Export
// ============================================================================

export const exportToCSV = (payload: ExportPayload): void => {
    const rows: string[][] = [];

    // Add title and subtitle as comment lines
    rows.push([`# ${payload.title}`]);
    if (payload.subtitle) {
        rows.push([`# ${payload.subtitle}`]);
    }
    rows.push([]); // Empty row

    // Add metadata if enabled
    if (payload.includeMetadata && payload.metadata) {
        Object.entries(payload.metadata).forEach(([key, value]) => {
            if (value) {
                const label = key.replace(/([A-Z])/g, ' $1').trim();
                rows.push([`# ${label}: ${value}`]);
            }
        });
        rows.push([]); // Empty row
    }

    // Add headers
    rows.push(payload.columns.map(col => col.label));

    // Add data rows
    payload.rows.forEach(row => {
        const cells = row as Record<string, unknown>;
        const rowData = payload.columns.map(col =>
            formatValue(cells[col.key], col.format)
        );
        rows.push(rowData);
    });

    // Convert to CSV string
    const csvContent = rows
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', generateFileName(payload, 'csv'));
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ============================================================================
// PDF Export via browser print
// ============================================================================

export const exportToPDF = (payload: ExportPayload): void => {
    const fileName = generateFileName(payload, 'pdf');
    const pageSize = (payload.pageSize ?? 'a4').toUpperCase();
    const orientation = payload.orientation ?? 'landscape';
    const metadataRows = payload.includeMetadata && payload.metadata
        ? Object.entries(payload.metadata)
            .filter(([, value]) => value)
            .map(([key, value]) => `
                <div class="meta-row">
                    <span>${escapeHtml(key.replace(/([A-Z])/g, ' $1').trim())}</span>
                    <strong>${escapeHtml(value)}</strong>
                </div>
            `)
            .join('')
        : '';
    const headers = payload.columns
        .map((column) => `<th class="${column.align ? `align-${column.align}` : ''}">${escapeHtml(column.label)}</th>`)
        .join('');
    const rows = payload.rows
        .map((row) => {
            const cells = row as Record<string, unknown>;
            return `<tr>${payload.columns.map((column) => (
                `<td class="${column.align ? `align-${column.align}` : ''}">${escapeHtml(formatValue(cells[column.key], column.format))}</td>`
            )).join('')}</tr>`;
        })
        .join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(payload.title)}</title>
  <style>
    @page { size: ${pageSize} ${orientation}; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
    header { border-bottom: 1px solid #D1D5DB; margin-bottom: 16px; padding-bottom: 10px; }
    h1 { font-size: 20px; margin: 0; }
    .subtitle { color: #4B5563; margin-top: 4px; font-size: 12px; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; margin: 12px 0; font-size: 11px; }
    .meta-row { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #E5E7EB; padding-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { text-align: left; background: #F3F4F6; border: 1px solid #D1D5DB; padding: 6px; }
    td { border: 1px solid #E5E7EB; padding: 5px 6px; vertical-align: top; }
    tr:nth-child(even) td { background: #F9FAFB; }
    .align-center { text-align: center; }
    .align-right { text-align: right; }
    .print-note { margin-top: 12px; color: #6B7280; font-size: 10px; }
    @media print { .print-note { display: none; } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(payload.title)}</h1>
    ${payload.subtitle ? `<div class="subtitle">${escapeHtml(payload.subtitle)}</div>` : ''}
  </header>
  ${metadataRows ? `<section class="meta">${metadataRows}</section>` : ''}
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${payload.columns.length}">No rows to export.</td></tr>`}</tbody>
  </table>
  <p class="print-note">Use your browser print dialog to save this export as ${escapeHtml(fileName)}.</p>
  <script>window.document.title = ${JSON.stringify(fileName)}; window.focus(); setTimeout(function(){ window.print(); }, 250);</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = fileName.replace(/\\.pdf$/, '.html');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};

// ============================================================================
// Main Export Function
// ============================================================================

export const exportData = (payload: ExportPayload, format: ExportFormat): void => {
    try {
        switch (format) {
            case 'excel':
                exportToExcel(payload);
                break;
            case 'csv':
                exportToCSV(payload);
                break;
            case 'pdf':
                exportToPDF(payload);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
};

// ============================================================================
// Preset Helpers
// ============================================================================

export const createExportPayload = (
    title: string,
    columns: ExportColumn[],
    rows: object[],
    options?: Partial<ExportPayload>
): ExportPayload => {
    return {
        title,
        columns,
        rows,
        includeTimestamp: true,
        includeMetadata: true,
        freezeHeader: true,
        autoFilter: true,
        orientation: 'landscape',
        pageSize: 'a4',
        ...options
    };
};

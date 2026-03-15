// ============================================================================
// utils/exportUtils.ts
// Export utilities - Handles Excel, PDF, and CSV generation
// ============================================================================

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportPayload, ExportFormat, ExportColumn } from '@/app/types/export';

// ============================================================================
// Helper Functions
// ============================================================================

const formatValue = (value: any, format?: ExportColumn['format']): string => {
    if (value === null || value === undefined || value === '') return '';

    switch (format) {
        case 'date':
            return new Date(value).toLocaleDateString();
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

// ============================================================================
// Excel Export
// ============================================================================

export const exportToExcel = (payload: ExportPayload): void => {
    const workbook = XLSX.utils.book_new();
    const sheetData: any[][] = [];

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
        const rowData = payload.columns.map(col =>
            formatValue(row[col.key], col.format)
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
// PDF Export
// ============================================================================

export const exportToPDF = (payload: ExportPayload): void => {
    const orientation = payload.orientation || 'portrait';
    const pageSize = payload.pageSize || 'a4';

    const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: pageSize
    });

    let currentY = 15;

    // Add title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(payload.title, 14, currentY);
    currentY += 7;

    // Add subtitle
    if (payload.subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(payload.subtitle, 14, currentY);
        currentY += 5;
    }

    // Add metadata if enabled
    if (payload.includeMetadata && payload.metadata) {
        doc.setFontSize(8);
        currentY += 3;

        Object.entries(payload.metadata).forEach(([key, value]) => {
            if (value) {
                const label = key.replace(/([A-Z])/g, ' $1').trim();
                doc.text(`${label}: ${value}`, 14, currentY);
                currentY += 4;
            }
        });

        currentY += 2;
    }

    // Prepare table data
    const headers = payload.columns.map(col => col.label);
    const body = payload.rows.map(row =>
        payload.columns.map(col => formatValue(row[col.key], col.format))
    );

    // Add table
    autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: body,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2
        },
        headStyles: {
            fillColor: [59, 130, 246], // Blue-600
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        columnStyles: payload.columns.reduce((acc, col, idx) => {
            acc[idx] = {
                halign: col.align || 'left',
                cellWidth: col.width || 'auto'
            };
            return acc;
        }, {} as any),
        didDrawPage: (data) => {
            // Add page numbers
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(
                `Page ${data.pageNumber} of ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
    });

    // Save file
    doc.save(generateFileName(payload, 'pdf'));
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
        const rowData = payload.columns.map(col =>
            formatValue(row[col.key], col.format)
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
// Main Export Function
// ============================================================================

export const exportData = (payload: ExportPayload, format: ExportFormat): void => {
    try {
        switch (format) {
            case 'excel':
                exportToExcel(payload);
                break;
            case 'pdf':
                exportToPDF(payload);
                break;
            case 'csv':
                exportToCSV(payload);
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
    rows: Record<string, any>[],
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
export interface ExportColumn {
    key: string;
    label: string;
    width?: number; // For Excel column width
    align?: 'left' | 'center' | 'right'; // For PDF alignment
    format?: 'text' | 'number' | 'date' | 'percentage' | 'currency';
}

export interface ExportMetadata {
    generatedBy?: string;
    generatedAt?: string;
    academicYear?: string;
    term?: string;
    cohort?: string;
    [key: string]: string | undefined;
}

export interface ExportPayload {
    title: string;
    subtitle?: string;
    metadata?: ExportMetadata;
    columns: ExportColumn[];
    rows: Record<string, any>[];
    fileName?: string; // Custom filename, defaults to title

    // Optional configurations
    includeMetadata?: boolean; // Include metadata in export
    includeTimestamp?: boolean; // Add timestamp to filename
    sheetName?: string; // Excel sheet name

    // PDF specific
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'letter' | 'legal';

    // Excel specific
    freezeHeader?: boolean;
    autoFilter?: boolean;
}

export type ExportFormat = 'excel' | 'pdf' | 'csv';

export interface ExportOptions {
    format: ExportFormat;
    payload: ExportPayload;
}

// Preset configurations for common export scenarios
export interface ExportPreset {
    id: string;
    label: string;
    description?: string;
    icon?: any;
    columns: ExportColumn[];
    includeMetadata?: boolean;
    format?: ExportFormat;
}
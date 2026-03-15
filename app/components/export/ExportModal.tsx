// ============================================================================
// components/export/ExportModal.tsx
// Universal Export Modal - Format selection and export orchestration
// ============================================================================

'use client';

import { useState } from 'react';
import {
    Download,
    FileSpreadsheet,
    FileText,
    FileDown,
    X,
    CheckCircle,
    Info,
    Settings
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import type { ExportPayload, ExportFormat, ExportPreset } from '@/app/types/export';
import { exportData } from '@/app/utils/exportUtils';

interface ExportModalProps {
    open: boolean;
    onClose: () => void;
    payload: ExportPayload;
    presets?: ExportPreset[];
    defaultFormat?: ExportFormat;
    title?: string;
}

export function ExportModal({
    open,
    onClose,
    payload,
    presets,
    defaultFormat = 'excel',
    title = 'Export Data'
}: ExportModalProps) {
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(defaultFormat);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [exportOptions, setExportOptions] = useState({
        includeMetadata: payload.includeMetadata ?? true,
        includeTimestamp: payload.includeTimestamp ?? true,
        freezeHeader: payload.freezeHeader ?? true,
        autoFilter: payload.autoFilter ?? true
    });

    if (!open) return null;

    const handleExport = async () => {
        setExporting(true);
        try {
            // Apply preset if selected
            let finalPayload = { ...payload };

            if (selectedPreset && presets) {
                const preset = presets.find(p => p.id === selectedPreset);
                if (preset) {
                    finalPayload = {
                        ...finalPayload,
                        columns: preset.columns,
                        includeMetadata: preset.includeMetadata ?? exportOptions.includeMetadata
                    };
                }
            }

            // Apply advanced options
            finalPayload = {
                ...finalPayload,
                ...exportOptions
            };

            // Execute export
            exportData(finalPayload, selectedFormat);

            // Show success feedback
            setTimeout(() => {
                setExporting(false);
                onClose();
            }, 500);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
            setExporting(false);
        }
    };

    const formatOptions = [
        {
            value: 'excel' as ExportFormat,
            label: 'Excel Spreadsheet',
            icon: FileSpreadsheet,
            description: 'Best for data analysis and further editing',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
        },
        {
            value: 'pdf' as ExportFormat,
            label: 'PDF Document',
            icon: FileText,
            description: 'Best for printing and sharing',
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200'
        },
        {
            value: 'csv' as ExportFormat,
            label: 'CSV File',
            icon: FileDown,
            description: 'Best for importing into other systems',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {payload.rows.length} rows • {payload.columns.length} columns
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Document Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-blue-900">{payload.title}</p>
                                {payload.subtitle && (
                                    <p className="text-sm text-blue-700 mt-1">{payload.subtitle}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Presets (if provided) */}
                    {presets && presets.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Export Preset (Optional)
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => setSelectedPreset(null)}
                                    className={`text-left p-3 rounded-lg border-2 transition-colors ${selectedPreset === null
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <p className="font-medium text-gray-900">All Columns</p>
                                    <p className="text-xs text-gray-500">Export all available data</p>
                                </button>
                                {presets.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setSelectedPreset(preset.id)}
                                        className={`text-left p-3 rounded-lg border-2 transition-colors ${selectedPreset === preset.id
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium text-gray-900">{preset.label}</p>
                                            <Badge variant="default" size="sm">
                                                {preset.columns.length} cols
                                            </Badge>
                                        </div>
                                        {preset.description && (
                                            <p className="text-xs text-gray-500 mt-1">{preset.description}</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Select Export Format
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {formatOptions.map((option) => {
                                const Icon = option.icon;
                                const isSelected = selectedFormat === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => setSelectedFormat(option.value)}
                                        className={`p-4 rounded-lg border-2 transition-all ${isSelected
                                            ? `${option.borderColor} ${option.bgColor}`
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                    >
                                        <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? option.color : 'text-gray-400'}`} />
                                        <p className={`font-semibold text-sm ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                                            {option.label}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Advanced Options */}
                    <div>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            <Settings className="w-4 h-4" />
                            Advanced Options
                            <span className="text-gray-400">
                                {showAdvanced ? '▼' : '▶'}
                            </span>
                        </button>

                        {showAdvanced && (
                            <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg">
                                {selectedFormat === 'excel' && (
                                    <>
                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={exportOptions.freezeHeader}
                                                onChange={(e) => setExportOptions({ ...exportOptions, freezeHeader: e.target.checked })}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="text-sm text-gray-700">Freeze header row</span>
                                        </label>
                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={exportOptions.autoFilter}
                                                onChange={(e) => setExportOptions({ ...exportOptions, autoFilter: e.target.checked })}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="text-sm text-gray-700">Enable auto-filter</span>
                                        </label>
                                    </>
                                )}
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeMetadata}
                                        onChange={(e) => setExportOptions({ ...exportOptions, includeMetadata: e.target.checked })}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700">Include metadata (date, term, etc.)</span>
                                </label>
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeTimestamp}
                                        onChange={(e) => setExportOptions({ ...exportOptions, includeTimestamp: e.target.checked })}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700">Add timestamp to filename</span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1"
                            disabled={exporting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleExport}
                            className="flex-1"
                            disabled={exporting}
                        >
                            {exporting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Export {selectedFormat.toUpperCase()}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
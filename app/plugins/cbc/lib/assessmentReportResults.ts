import type {
    CbcAssessmentReportResult,
    CbcAssessmentResultStatus,
    CbcLevel,
} from '@/app/plugins/cbc/types/cbc';

export const CBC_ASSESSMENT_RESULT_STATUS_LABELS: Record<CbcAssessmentResultStatus, string> = {
    FINAL: 'Final',
    PROVISIONAL: 'Provisional',
    INCOMPLETE: 'Incomplete',
};

export const CBC_ASSESSMENT_RESULT_STATUS_HELPER_TEXT: Record<CbcAssessmentResultStatus, string> = {
    FINAL: 'All required components are available.',
    PROVISIONAL: 'Some required components are missing.',
    INCOMPLETE: 'No contributing result is available yet.',
};

export const CBC_LEVEL_LABELS: Record<CbcLevel, string> = {
    BE: 'Below Expectation',
    AE: 'Approaching Expectation',
    ME: 'Meeting Expectation',
    EE: 'Exceeding Expectation',
    '': '—',
};

export function getCbcLevelLabel(result: Pick<CbcAssessmentReportResult, 'cbc_level' | 'cbc_label'>): string {
    return result.cbc_label.trim() || CBC_LEVEL_LABELS[result.cbc_level] || '—';
}

export function formatCbcWeightedScore(value: number | null): string {
    if (value === null || Number.isNaN(value)) return '—';

    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

export function formatCbcDateTime(value: string | null): string {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

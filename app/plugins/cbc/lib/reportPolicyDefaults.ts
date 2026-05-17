import type {
    CbcLevelScaleRow,
    CbcReportPolicyPayload,
} from '@/app/plugins/cbc/types/reportPolicy';

export const CBC_DEFAULT_LEVEL_SCALE: CbcLevelScaleRow[] = [
    { min: 90, max: 99, level: 'EE', code: 'EE1', label: 'Exceeding Expectation', points: 4.0 },
    { min: 75, max: 89, level: 'EE', code: 'EE2', label: 'Exceeding Expectation', points: 3.5 },
    { min: 58, max: 74, level: 'ME', code: 'ME1', label: 'Meeting Expectation', points: 3.0 },
    { min: 41, max: 57, level: 'ME', code: 'ME2', label: 'Meeting Expectation', points: 2.5 },
    { min: 31, max: 40, level: 'AE', code: 'AE1', label: 'Approaching Expectation', points: 2.0 },
    { min: 21, max: 30, level: 'AE', code: 'AE2', label: 'Approaching Expectation', points: 1.5 },
    { min: 11, max: 20, level: 'BE', code: 'BE1', label: 'Below Expectation', points: 1.0 },
    { min: 1, max: 10, level: 'BE', code: 'BE2', label: 'Below Expectation', points: 0.5 },
];

export const CBC_ENTRY_MIDTERM_PRESET = {
    assessment_weights: {
        ENTRY: 30,
        MIDTERM: 70,
        MAIN_EXAM: 0,
    },
    required_components: ['ENTRY', 'MIDTERM'],
    diagnostic_assessment_types: [],
} satisfies Pick<
    CbcReportPolicyPayload,
    'assessment_weights' | 'required_components' | 'diagnostic_assessment_types'
>;

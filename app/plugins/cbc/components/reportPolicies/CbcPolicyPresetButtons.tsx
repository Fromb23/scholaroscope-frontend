'use client';

import { Button } from '@/app/components/ui/Button';

export interface CbcPolicyPreset {
    label: string;
    assessmentWeights: Record<string, number>;
    requiredComponents: string[];
    diagnosticAssessmentTypes: string[];
    includeAssignments?: boolean;
    includeProjects?: boolean;
    includePracticals?: boolean;
}

const CBC_POLICY_PRESETS: CbcPolicyPreset[] = [
    {
        label: 'CAT 30 + Main Exam 70',
        assessmentWeights: { CAT: 30, MAIN_EXAM: 70 },
        requiredComponents: ['MAIN_EXAM'],
        diagnosticAssessmentTypes: [],
        includeAssignments: false,
        includeProjects: false,
        includePracticals: false,
    },
    {
        label: 'CAT 40 + Main Exam 60',
        assessmentWeights: { CAT: 40, MAIN_EXAM: 60 },
        requiredComponents: ['MAIN_EXAM'],
        diagnosticAssessmentTypes: [],
        includeAssignments: false,
        includeProjects: false,
        includePracticals: false,
    },
    {
        label: 'Main Exam only',
        assessmentWeights: { MAIN_EXAM: 100 },
        requiredComponents: ['MAIN_EXAM'],
        diagnosticAssessmentTypes: [],
        includeAssignments: false,
        includeProjects: false,
        includePracticals: false,
    },
    {
        label: 'CBC Entry diagnostic + Midterm report',
        assessmentWeights: { ENTRY: 0, MIDTERM: 100 },
        requiredComponents: ['MIDTERM'],
        diagnosticAssessmentTypes: ['ENTRY'],
        includeAssignments: false,
        includeProjects: false,
        includePracticals: false,
    },
    {
        label: 'Assignments + Project + Practical evidence',
        assessmentWeights: { ASSIGNMENT: 34, PROJECT: 33, PRACTICAL: 33 },
        requiredComponents: [],
        diagnosticAssessmentTypes: [],
        includeAssignments: true,
        includeProjects: true,
        includePracticals: true,
    },
];

interface CbcPolicyPresetButtonsProps {
    onApply: (preset: CbcPolicyPreset) => void;
}

export function CbcPolicyPresetButtons({ onApply }: CbcPolicyPresetButtonsProps) {
    return (
        <div className="mb-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">Preset</p>
            <div className="flex flex-wrap gap-2">
                {CBC_POLICY_PRESETS.map((preset) => (
                    <Button
                        key={preset.label}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onApply(preset)}
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}

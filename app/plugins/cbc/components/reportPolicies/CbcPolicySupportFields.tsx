'use client';

import { ASSESSMENT_TYPE_OPTIONS, getAssessmentTypeLabel } from '@/app/core/types/assessment';

type EvidenceSourceField = 'include_assignments' | 'include_projects' | 'include_practicals';
type ComponentArrayField = 'required_components' | 'diagnostic_assessment_types';

interface CbcPolicySupportFieldsProps {
    requiredComponents: string[];
    diagnosticAssessmentTypes: string[];
    includeAssignments: boolean;
    includeProjects: boolean;
    includePracticals: boolean;
    onToggleArrayValue: (field: ComponentArrayField, value: string) => void;
    onSetEvidenceSource: (field: EvidenceSourceField, value: boolean) => void;
}

export function CbcPolicySupportFields({
    requiredComponents,
    diagnosticAssessmentTypes,
    includeAssignments,
    includeProjects,
    includePracticals,
    onToggleArrayValue,
    onSetEvidenceSource,
}: CbcPolicySupportFieldsProps) {
    return (
        <>
            <div className="border-t border-gray-100 pt-4">
                <p className="mb-1 text-sm font-medium text-gray-700">Required Components</p>
                <p className="mb-2 text-xs text-gray-500">
                    These must exist before the learner&apos;s report can become final. If missing, the result stays provisional.
                </p>
                <div className="flex flex-wrap gap-2">
                    {ASSESSMENT_TYPE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onToggleArrayValue('required_components', option.value)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                requiredComponents.includes(option.value)
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400'
                            }`}
                        >
                            {getAssessmentTypeLabel(option.value)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
                <p className="mb-1 text-sm font-medium text-gray-700">Diagnostic Assessment Types</p>
                <p className="mb-2 text-xs text-gray-500">
                    These are used for baseline/context. They can appear in reports but do not have to contribute to the final score.
                </p>
                <div className="flex flex-wrap gap-2">
                    {ASSESSMENT_TYPE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onToggleArrayValue('diagnostic_assessment_types', option.value)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                diagnosticAssessmentTypes.includes(option.value)
                                    ? 'border-green-600 bg-green-600 text-white'
                                    : 'border-gray-300 bg-white text-gray-600 hover:border-green-400'
                            }`}
                        >
                            {getAssessmentTypeLabel(option.value)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs text-gray-500">
                    Turn these on only when this evidence should count in this policy.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                    <EvidenceCheckbox
                        checked={includeAssignments}
                        label="Include assignments"
                        onChange={(value) => onSetEvidenceSource('include_assignments', value)}
                    />
                    <EvidenceCheckbox
                        checked={includeProjects}
                        label="Include projects"
                        onChange={(value) => onSetEvidenceSource('include_projects', value)}
                    />
                    <EvidenceCheckbox
                        checked={includePracticals}
                        label="Include practicals"
                        onChange={(value) => onSetEvidenceSource('include_practicals', value)}
                    />
                </div>
            </div>
        </>
    );
}

function EvidenceCheckbox({
    checked,
    label,
    onChange,
}: {
    checked: boolean;
    label: string;
    onChange: (value: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center gap-2 pt-6">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">{label}</span>
        </label>
    );
}

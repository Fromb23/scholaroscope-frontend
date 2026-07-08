import { getAssessmentTypeLabel } from '@/app/core/types/assessment';
import type { GradePolicy } from '@/app/core/types/gradePolicy';

function labelAssessmentType(type: string): string {
    return getAssessmentTypeLabel(type) || type.replaceAll('_', ' ');
}

function formatWeight(weight: number): string {
    return Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
}

export function buildGradePolicyRuleSummary(policy: Pick<
    GradePolicy,
    'category_configs' | 'default_weighting' | 'required_components'
>): string[] {
    if (policy.category_configs?.length) {
        const lines = ['Final report requires:'];
        const sortedConfigs = [...policy.category_configs].sort((left, right) => left.sequence - right.sequence);

        sortedConfigs.forEach((config) => {
            if (config.weight > 0) {
                lines.push(`${labelAssessmentType(config.assessment_type)} contributes ${formatWeight(config.weight)}%`);
            }
            if (config.combine_method) {
                lines.push(`${labelAssessmentType(config.assessment_type)} evidence is combined using ${config.combine_method.toLowerCase().replaceAll('_', ' ')}`);
            }
        });

        if (policy.required_components.length > 0) {
            lines.push(`Required: ${policy.required_components.map(labelAssessmentType).join(', ')}`);
        }

        return lines;
    }

    const lines = ['Legacy weighted policy:'];
    Object.entries(policy.default_weighting ?? {})
        .filter(([, weight]) => weight > 0)
        .forEach(([type, weight]) => {
            lines.push(`${labelAssessmentType(type)} contributes ${formatWeight(weight)}%`);
        });
    lines.push(
        policy.required_components.length > 0
            ? `Required: ${policy.required_components.map(labelAssessmentType).join(', ')}`
            : 'Required: none',
    );

    return lines;
}

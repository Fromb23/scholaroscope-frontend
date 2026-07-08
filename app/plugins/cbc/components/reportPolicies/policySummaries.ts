import { getAssessmentTypeLabel } from '@/app/core/types/assessment';
import type { CbcReportPolicy } from '@/app/plugins/cbc/types/reportPolicy';

function labelAssessmentType(type: string): string {
    return getAssessmentTypeLabel(type) || type.replaceAll('_', ' ');
}

function formatWeight(weight: number): string {
    return Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
}

function formatComponentName(component: string): string {
    return component
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRecordCount(count: number): string {
    return `${count} ${count === 1 ? 'record' : 'records'}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readRequirementType(requirement: Record<string, unknown>): string | null {
    return (
        readString(requirement.assessment_type)
        ?? readString(requirement.type)
        ?? readString(requirement.component)
        ?? readString(requirement.category)
    );
}

function readRequirementMinimum(requirement: Record<string, unknown>): number {
    return (
        readNumber(requirement.min_count)
        ?? readNumber(requirement.minimum_count)
        ?? readNumber(requirement.required_count)
        ?? readNumber(requirement.count)
        ?? 1
    );
}

function collectRequirementLines(config: Record<string, unknown>): string[] {
    const candidates = [
        config.required_evidence,
        config.requirements,
        config.final_requirements,
        config.required_components,
    ];
    const lines: string[] = [];

    candidates.forEach((candidate) => {
        if (!Array.isArray(candidate)) return;

        candidate.forEach((entry) => {
            if (typeof entry === 'string') {
                lines.push(`${labelAssessmentType(entry)} evidence, at least 1 record`);
                return;
            }
            if (!isRecord(entry)) return;

            const anyOf = readStringArray(entry.any_of ?? entry.either_of ?? entry.one_of);
            if (anyOf.length > 0) {
                lines.push(`Either ${anyOf.map(labelAssessmentType).join(' or ')}`);
                return;
            }

            const type = readRequirementType(entry);
            if (type) {
                lines.push(`${labelAssessmentType(type)} evidence, at least ${formatRecordCount(readRequirementMinimum(entry))}`);
            }
        });
    });

    return lines;
}

function collectChoiceLines(config: Record<string, unknown>): string[] {
    const candidates = [
        config.any_of,
        config.either_of,
        config.one_of,
        config.alternative_components,
    ];

    return candidates.flatMap((candidate) => {
        const choices = readStringArray(candidate);
        return choices.length > 0 ? [`Either ${choices.map(labelAssessmentType).join(' or ')}`] : [];
    });
}

function collectFallbackLines(config: Record<string, unknown>): string[] {
    const fallbackConfig = config.component_fallbacks ?? config.fallback_order ?? config.component_priority;
    if (!isRecord(fallbackConfig)) return [];

    return Object.entries(fallbackConfig).flatMap(([component, order]) => {
        const orderedTypes = readStringArray(order);
        if (orderedTypes.length < 2) return [];

        const first = labelAssessmentType(orderedTypes[0]);
        const fallback = labelAssessmentType(orderedTypes[1]);
        return [`${formatComponentName(component)} component uses ${first} first; if missing, ${fallback}`];
    });
}

function collectWeightLines(weights: Record<string, number>): string[] {
    return Object.entries(weights)
        .filter(([, weight]) => weight > 0)
        .map(([type, weight]) => `${labelAssessmentType(type)} contributes ${formatWeight(weight)}%`);
}

export function buildCbcPolicyRuleSummary(policy: Pick<
    CbcReportPolicy,
    'assessment_weights' | 'required_components' | 'flexible_config'
>): string[] {
    if (policy.flexible_config && Object.keys(policy.flexible_config).length > 0) {
        const lines = [
            'Final report requires:',
            ...collectRequirementLines(policy.flexible_config),
            ...collectChoiceLines(policy.flexible_config),
            ...collectFallbackLines(policy.flexible_config),
            ...collectWeightLines(policy.assessment_weights),
        ];

        return Array.from(new Set(lines));
    }

    const lines = [
        'Legacy weighted policy:',
        ...collectWeightLines(policy.assessment_weights),
    ];

    lines.push(
        policy.required_components.length > 0
            ? `Required: ${policy.required_components.map(labelAssessmentType).join(', ')}`
            : 'Required: none',
    );

    return lines;
}

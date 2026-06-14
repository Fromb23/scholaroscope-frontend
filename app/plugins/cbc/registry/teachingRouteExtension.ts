import {
    registerSessionClosureEvidenceWorkflowResolver,
    registerSessionTeachingWorkflowResolver,
} from '@/app/core/registry/pluginRoutes';
import { teachingAPI } from '@/app/plugins/cbc/api/cbc';
import {
    buildPracticalWorkflowHref,
    resolvePracticalProfileFromSession,
} from '@/app/plugins/cbc/lib/practicalProfiles';

function withQueryParams(href: string, params: Record<string, string | null | undefined>) {
    const [basePath, existingQuery = ''] = href.split('?', 2);
    const searchParams = new URLSearchParams(existingQuery);

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        } else {
            searchParams.delete(key);
        }
    });

    return searchParams.size > 0 ? `${basePath}?${searchParams.toString()}` : basePath;
}

function buildEvidenceWorkflowHref(sessionId: number, outcomeId: number, returnTo: string) {
    return withQueryParams(
        `/cbc/teaching/sessions/${sessionId}/outcomes/${outcomeId}/evidence`,
        {
            action: 'record-evidence',
            notice: 'closure-evidence-required',
            returnTo,
        },
    );
}

registerSessionTeachingWorkflowResolver({
    key: 'cbc-session-teaching',
    priority: 10,
    resolve: (session) => {
        if (!['CBE', 'CBC'].includes(session.curriculum_type)) return null;

        const practicalProfile = resolvePracticalProfileFromSession(session);
        if (practicalProfile) {
            return {
                pluginKey: 'cbc',
                href: buildPracticalWorkflowHref(session.id),
                title: practicalProfile.label,
                actionLabel: 'Record practical evidence',
                description: practicalProfile.description,
            };
        }

        return {
            pluginKey: 'cbc',
            href: `/cbc/teaching/sessions/${session.id}/outcomes`,
            title: 'CBC Teaching',
            actionLabel: 'Record evidence',
            description: 'Review confirmed taught outcomes, check learners, and record class performance for this lesson.',
        };
    },
});

registerSessionClosureEvidenceWorkflowResolver({
    key: 'cbc-session-closure-evidence',
    priority: 10,
    resolve: async ({ requiredOutcomeIds, returnTo, session }) => {
        if (!['CBE', 'CBC'].includes(session.curriculum_type) || requiredOutcomeIds.length === 0) {
            return null;
        }

        if (resolvePracticalProfileFromSession(session)) {
            return buildPracticalWorkflowHref(session.id, returnTo);
        }

        if (requiredOutcomeIds.length === 1) {
            return buildEvidenceWorkflowHref(session.id, requiredOutcomeIds[0], returnTo);
        }

        const requiredOutcomeIdSet = new Set(requiredOutcomeIds);
        const sessionOutcomes = await teachingAPI.getSessionOutcomes(session.id);
        const missingOutcome = sessionOutcomes.find((outcome) => (
            requiredOutcomeIdSet.has(outcome.learning_outcome) && outcome.evidence_count === 0
        ));

        return missingOutcome
            ? buildEvidenceWorkflowHref(session.id, missingOutcome.learning_outcome, returnTo)
            : null;
    },
});

import type { Session } from '@/app/core/types/session';

type SessionTeachingSession = Pick<
    Session,
    'id' | 'curriculum_name' | 'curriculum_type' | 'subject_id' | 'subject_source' | 'offering_id' | 'cambridge_cohort_subject_id'
>;

export interface SessionTeachingWorkflow {
    pluginKey: string;
    href: string;
    title: string;
    actionLabel: string;
    description: string;
}

interface SessionTeachingWorkflowResolver {
    key: string;
    priority?: number;
    resolve: (session: SessionTeachingSession) => SessionTeachingWorkflow | null;
}

const _sessionTeachingResolvers: SessionTeachingWorkflowResolver[] = [];

export function registerSessionTeachingWorkflowResolver(
    resolver: SessionTeachingWorkflowResolver
): void {
    if (_sessionTeachingResolvers.some((entry) => entry.key === resolver.key)) return;
    _sessionTeachingResolvers.push(resolver);
    _sessionTeachingResolvers.sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

export function getSessionTeachingWorkflow(
    session: SessionTeachingSession | null | undefined
): SessionTeachingWorkflow | null {
    if (!session) return null;

    for (const resolver of _sessionTeachingResolvers) {
        const workflow = resolver.resolve(session);
        if (workflow) return workflow;
    }

    return null;
}

export function getSessionTeachingRoute(
    session: SessionTeachingSession | null | undefined
): string | null {
    return getSessionTeachingWorkflow(session)?.href ?? null;
}

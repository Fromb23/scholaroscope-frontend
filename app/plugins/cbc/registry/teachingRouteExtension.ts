import { registerSessionTeachingWorkflowResolver } from '@/app/core/registry/pluginRoutes';

registerSessionTeachingWorkflowResolver({
    key: 'cbc-session-teaching',
    priority: 10,
    resolve: (session) => {
        if (session.curriculum_type !== 'CBE') return null;

        return {
            pluginKey: 'cbc',
            href: `/cbc/teaching/sessions/${session.id}/outcomes`,
            title: 'CBC Teaching',
            actionLabel: 'Record evidence',
            description: 'Review confirmed taught outcomes, check learners, and record class performance for this lesson.',
        };
    },
});

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
            actionLabel: 'Open CBC Teaching',
            description: 'Record what was taught, review learners, and capture class performance for this lesson.',
        };
    },
});

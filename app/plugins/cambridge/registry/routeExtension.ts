// ============================================================================
// app/plugins/cambridge/registry/routeExtension.ts
//
// Registers Cambridge route metadata consumed by kernel pages.
// ============================================================================

import { isCambridgeCurriculum } from '@/app/core/lib/curriculumBridge';
import { registerSessionTeachingWorkflowResolver } from '@/app/core/registry/pluginRoutes';

registerSessionTeachingWorkflowResolver({
    key: 'cambridge-session-teaching',
    priority: 20,
    resolve: (session) => {
        if (!isCambridgeCurriculum(session)) return null;

        return {
            pluginKey: 'cambridge',
            href: `/cambridge/teaching/sessions/${session.id}`,
            title: 'Cambridge Teaching',
            actionLabel: 'Open Cambridge Teaching',
            description: 'Open the Cambridge learning-unit workspace for this session.',
        };
    },
});

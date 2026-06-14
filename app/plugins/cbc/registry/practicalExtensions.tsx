'use client';

import { registerSessionDetailExtension } from '@/app/core/registry/sessionDetailExtensions';
import { PracticalLessonPanel } from '@/app/plugins/cbc/components/practicals/PracticalLessonPanel';
import { resolvePracticalProfileFromSession } from '@/app/plugins/cbc/lib/practicalProfiles';

registerSessionDetailExtension({
    key: 'cbc-practical-detail',
    priority: 10,
    supports: ({ session }) => resolvePracticalProfileFromSession(session) !== null,
    Component: ({ session }) => <PracticalLessonPanel session={session} />,
});

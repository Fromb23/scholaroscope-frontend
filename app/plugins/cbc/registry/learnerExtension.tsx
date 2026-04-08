import { registerLearnerProfileExtension } from '@/app/core/registry/learnerSlot';
import type { LearnerSlotContext } from '@/app/core/registry/learnerSlot';
import { CBCLearnerInsights } from '@/app/plugins/cbc/components/CBCLearnerInsights';

registerLearnerProfileExtension({
    key: 'cbc',
    priority: 10,
    supports: (ctx: LearnerSlotContext) => ctx.curricula.includes('CBE'),
    component: CBCLearnerInsights,
});
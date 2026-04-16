import { registerSubjectProfileExtension, SubjectSlotContext } from '@/app/core/registry/subjectSlot';

registerSubjectProfileExtension({
    key: 'cbc-progress',
    label: 'CBC Progress',
    priority: 10,
    supports: (ctx: SubjectSlotContext) => ctx.curriculum_type === 'CBE',
    href: (ctx: SubjectSlotContext) => `/cbc/progress?subject=${ctx.subjectId}`,
});

registerSubjectProfileExtension({
    key: 'cbc-browser',
    label: 'CBC Browser',
    priority: 20,
    supports: (ctx: SubjectSlotContext) => ctx.curriculum_type === 'CBE',
    href: (ctx: SubjectSlotContext) => `/cbc/browser?subject=${ctx.subjectId}`,
});
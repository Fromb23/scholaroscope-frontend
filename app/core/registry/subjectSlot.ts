
export interface SubjectSlotContext {
    subjectId: number;
    curriculum_type: string;
}

export interface SubjectProfileExtension {
    key: string;
    supports: (ctx: SubjectSlotContext) => boolean;
    href: (ctx: SubjectSlotContext) => string;
    priority?: number;
    label: string;
}

const _extensions: SubjectProfileExtension[] = [];

export function registerSubjectProfileExtension(ext: SubjectProfileExtension): void {
    if (_extensions.find(e => e.key === ext.key)) return; // idempotent
    _extensions.push(ext);
    _extensions.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
}

export function getSubjectProfileExtensions(
    ctx: SubjectSlotContext
): SubjectProfileExtension[] {
    return _extensions.filter(ext => ext.supports(ctx));
}
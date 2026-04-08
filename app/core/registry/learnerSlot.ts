import type { ComponentType } from 'react';

export interface LearnerSlotContext {
    studentId: number;
    curricula: string[];
}

export interface LearnerProfileExtension {
    key: string;
    supports: (ctx: LearnerSlotContext) => boolean;
    component: ComponentType<{ studentId: number }>;
    priority?: number;
}

const _extensions: LearnerProfileExtension[] = [];

export function registerLearnerProfileExtension(ext: LearnerProfileExtension): void {
    if (_extensions.find(e => e.key === ext.key)) return; // idempotent
    _extensions.push(ext);
    _extensions.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
}

export function getLearnerProfileExtensions(
    ctx: LearnerSlotContext
): LearnerProfileExtension[] {
    return _extensions.filter(ext => ext.supports(ctx));
}
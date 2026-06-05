import type { ComponentType } from 'react';

import type {
    LessonPlan,
    ScheduleLessonFormData,
} from '@/app/core/types/lessonPlans';

export interface LessonPlanScheduleExtensionContext {
    lessonPlan: LessonPlan;
    scheduleForm: ScheduleLessonFormData;
}

export interface LessonPlanScheduleExtensionComponentProps
    extends LessonPlanScheduleExtensionContext {
    errors: Record<string, string>;
    onChange: (patch: Partial<ScheduleLessonFormData>) => void;
}

export interface LessonPlanScheduleExtension {
    key: string;
    priority?: number;
    supports: (context: LessonPlanScheduleExtensionContext) => boolean;
    Component: ComponentType<LessonPlanScheduleExtensionComponentProps>;
    validate?: (context: LessonPlanScheduleExtensionContext) => Record<string, string>;
}

const _extensions: LessonPlanScheduleExtension[] = [];

export function registerLessonPlanScheduleExtension(
    extension: LessonPlanScheduleExtension,
): void {
    if (_extensions.some((entry) => entry.key === extension.key)) {
        return;
    }

    _extensions.push(extension);
    _extensions.sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

export function getLessonPlanScheduleExtensions(
    context: LessonPlanScheduleExtensionContext,
): LessonPlanScheduleExtension[] {
    return _extensions.filter((extension) => extension.supports(context));
}

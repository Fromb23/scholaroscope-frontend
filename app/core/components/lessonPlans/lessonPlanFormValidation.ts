import type { FormFieldErrors } from '@/app/core/forms';

export const LESSON_TITLE_REQUIRED_MESSAGE = 'Lesson title is required.';

export type LessonPlanGenerationField = 'title';
export type LessonPlanEditField = 'title';

export const LESSON_PLAN_GENERATION_FIELD_ORDER: LessonPlanGenerationField[] = ['title'];
export const LESSON_PLAN_EDIT_FIELD_ORDER: LessonPlanEditField[] = ['title'];

export const LESSON_PLAN_FIELD_LABELS: Record<LessonPlanGenerationField | LessonPlanEditField, string> = {
  title: 'Lesson title',
};

export function validateLessonPlanGenerationForm(args: {
  title: string;
}): FormFieldErrors<LessonPlanGenerationField> {
  return validateLessonTitle(args.title);
}

export function validateLessonPlanEditForm(args: {
  title: string;
}): FormFieldErrors<LessonPlanEditField> {
  return validateLessonTitle(args.title);
}

function validateLessonTitle<TField extends 'title'>(title: string): FormFieldErrors<TField> {
  if (title.trim()) {
    return {};
  }

  return {
    title: LESSON_TITLE_REQUIRED_MESSAGE,
  } as FormFieldErrors<TField>;
}

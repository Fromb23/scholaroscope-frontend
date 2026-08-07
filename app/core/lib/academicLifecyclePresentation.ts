import type {
  AcademicLifecycleContext,
  AcademicLifecycleTransition,
} from '@/app/core/types/academic';

export type LifecycleActorKind = 'admin' | 'instructor' | 'self_managed';

export interface LifecyclePresentation {
  shouldRender: boolean;
  title: string;
  message: string;
  actionLabel: string | null;
  actionHref: string | null;
  disabledTeachingReason: string | null;
}

function appendId(params: URLSearchParams, key: string, value: number | null | undefined): void {
  if (Number.isInteger(value) && Number(value) > 0) {
    params.set(key, String(value));
  }
}

function academicActionHref(transition: AcademicLifecycleTransition | undefined): string | null {
  if (!transition) return null;
  if (transition.kind === 'CREATE_TERM') {
    const params = new URLSearchParams({ action: 'create' });
    appendId(params, 'curriculum', transition.curriculum_id);
    appendId(params, 'academicYear', transition.academic_year_id);
    return `/academic/terms?${params.toString()}`;
  }
  if (transition.kind === 'CREATE_ACADEMIC_YEAR') {
    const params = new URLSearchParams({ action: 'create' });
    appendId(params, 'curriculum', transition.curriculum_id);
    return `/academic/years?${params.toString()}`;
  }
  if (transition.kind === 'COMPLETE_INITIAL_SETUP') {
    return '/academic';
  }
  return null;
}

function actionLabel(transition: AcademicLifecycleTransition | undefined): string | null {
  if (!transition) return null;
  if (transition.kind === 'CREATE_TERM') return 'Create next term';
  if (transition.kind === 'CREATE_ACADEMIC_YEAR') return 'Create next academic year';
  if (transition.kind === 'COMPLETE_INITIAL_SETUP') return 'Complete academic setup';
  return null;
}

export function resolveAcademicLifecyclePresentation(
  context: AcademicLifecycleContext | null | undefined,
  actor: LifecycleActorKind,
): LifecyclePresentation {
  if (!context) {
    return {
      shouldRender: false,
      title: '',
      message: '',
      actionLabel: null,
      actionHref: null,
      disabledTeachingReason: null,
    };
  }

  const transition = context.transition;
  const adminLike = actor === 'admin' || actor === 'self_managed';
  const contactAdmin = transition?.kind === 'CREATE_ACADEMIC_YEAR'
    ? 'Contact your workspace administrator to create the next academic year.'
    : 'Contact your workspace administrator to create the next term.';
  const transitionActionLabel = adminLike ? actionLabel(transition) : null;
  const transitionActionHref = adminLike ? academicActionHref(transition) : null;

  if (transition?.kind === 'WAIT_FOR_UPCOMING_TERM') {
    const starts = transition.starts_on ? ` It starts on ${transition.starts_on}.` : '';
    return {
      shouldRender: true,
      title: context.term?.name ? `${context.term.name} is configured` : 'Upcoming term configured',
      message: `${context.message}${starts} New teaching remains paused until it starts.`,
      actionLabel: null,
      actionHref: null,
      disabledTeachingReason: `${context.message}${starts}`,
    };
  }

  if (transition?.kind === 'CREATE_ACADEMIC_YEAR' || context.mode === 'ACADEMIC_YEAR_ENDED') {
    const adminMessage = 'The academic year has ended. Create the next academic year before adding new teaching work.';
    return {
      shouldRender: true,
      title: 'Academic year ended',
      message: adminLike ? adminMessage : `The academic year has ended. ${contactAdmin}`,
      actionLabel: transitionActionLabel,
      actionHref: transitionActionHref,
      disabledTeachingReason: adminLike ? adminMessage : `The academic year has ended. ${contactAdmin}`,
    };
  }

  if (transition?.kind === 'CREATE_TERM' || context.mode === 'TERM_ENDED') {
    const cleanup = context.allows_cleanup
      ? ' Pending records may still be completed during the closure grace period.'
      : '';
    const adminMessage = `Your previous term has ended.${cleanup} Set up the next term when you're ready. New teaching work remains paused until an active term is available.`;
    return {
      shouldRender: true,
      title: 'Term ended',
      message: adminLike ? adminMessage : `This term has ended.${cleanup} ${contactAdmin}`,
      actionLabel: transitionActionLabel,
      actionHref: transitionActionHref,
      disabledTeachingReason: adminLike ? adminMessage : `This term has ended. ${contactAdmin}`,
    };
  }

  if (context.mode === 'CLOSURE_GRACE') {
    const base = 'New teaching is closed for this term. Pending records may still be completed during the closure grace period.';
    return {
      shouldRender: true,
      title: 'Closure grace period',
      message: transitionActionLabel ? `${base} ${context.message}` : base,
      actionLabel: transitionActionLabel,
      actionHref: transitionActionHref,
      disabledTeachingReason: base,
    };
  }

  if (context.mode === 'NO_ACADEMIC_SETUP') {
    return {
      shouldRender: true,
      title: 'Academic setup required',
      message: context.message,
      actionLabel: transitionActionLabel,
      actionHref: transitionActionHref,
      disabledTeachingReason: context.message,
    };
  }

  return {
    shouldRender: false,
    title: '',
    message: '',
    actionLabel: null,
    actionHref: null,
    disabledTeachingReason: null,
  };
}

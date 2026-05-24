import type {
  AssistantAction,
  AssistantPageActionRegistration,
  AssistantPageContext,
  AssistantPageContextRegistration,
} from '@/app/core/types/assistant';

type AssistantContextLike = AssistantPageContext | AssistantPageContextRegistration;

function actionKey(action: AssistantAction): string {
  return `${action.type}:${action.label}:${action.href ?? ''}:${action.target ?? ''}:${action.prompt ?? ''}`;
}

function toSerializableValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializableValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const nextValue = toSerializableValue((value as Record<string, unknown>)[key]);
        if (nextValue !== undefined) {
          result[key] = nextValue;
        }
        return result;
      }, {});
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }

  return value;
}

export function normalizeAssistantAction(
  action: AssistantAction | AssistantPageActionRegistration
): AssistantAction {
  return {
    label: action.label,
    type: action.type,
    href: action.href,
    target: action.target,
    prompt: action.prompt,
  };
}

export function mergeAssistantVisibleActions(
  visibleActions: AssistantPageActionRegistration[] | undefined,
  nextSafeAction?: AssistantPageActionRegistration
): AssistantAction[] {
  const merged = [
    ...(visibleActions ?? []),
    ...(nextSafeAction ? [nextSafeAction] : []),
  ].map(normalizeAssistantAction);
  const seen = new Set<string>();

  return merged.filter((action) => {
    const key = actionKey(action);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function buildAssistantPageContextSignature(context: AssistantContextLike | null): string {
  if (!context) {
    return '';
  }

  return JSON.stringify(toSerializableValue({
    pageKey: context.pageKey,
    pageTitle: context.pageTitle,
    state: context.state ?? {},
    visibleActions: (context.visibleActions ?? []).map((action) => normalizeAssistantAction(action)),
    nextSafeAction: context.nextSafeAction ? normalizeAssistantAction(context.nextSafeAction) : undefined,
    workflowStep: context.workflowStep,
    emptyStateReason: context.emptyStateReason,
  }));
}

function areActionRegistrationsEqual(
  left: AssistantPageActionRegistration | undefined,
  right: AssistantPageActionRegistration | undefined
): boolean {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return actionKey(normalizeAssistantAction(left)) === actionKey(normalizeAssistantAction(right))
    && left.handler === right.handler;
}

export function haveAssistantActionRegistrationsChanged(
  previous: AssistantPageContextRegistration | null | undefined,
  next: AssistantPageContextRegistration
): boolean {
  const previousVisibleActions = previous?.visibleActions ?? [];
  const nextVisibleActions = next.visibleActions ?? [];

  if (previousVisibleActions.length !== nextVisibleActions.length) {
    return true;
  }

  for (let index = 0; index < nextVisibleActions.length; index += 1) {
    if (!areActionRegistrationsEqual(previousVisibleActions[index], nextVisibleActions[index])) {
      return true;
    }
  }

  return !areActionRegistrationsEqual(previous?.nextSafeAction, next.nextSafeAction);
}

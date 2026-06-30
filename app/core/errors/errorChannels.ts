import type { AppError, ErrorChannel, ResolveAppErrorContext } from './appError';

const BANNER_ACTIONS = new Set<ResolveAppErrorContext['action']>([
  'create',
  'update',
  'delete',
  'submit',
  'save',
  'publish',
  'review',
  'compute',
  'export',
  'switch',
  'login',
  'verify',
]);

const BACKGROUND_ACTIONS = new Set<ResolveAppErrorContext['action']>([
  'refresh',
  'logout',
  'sync',
]);

export function resolveErrorChannel(
  error: Pick<AppError, 'kind' | 'fieldErrors' | 'retryable' | 'severity' | 'channel'>,
  context: ResolveAppErrorContext,
): ErrorChannel {
  if (error.channel) {
    return error.channel;
  }
  if (context.channel) {
    return context.channel;
  }
  if (context.background || BACKGROUND_ACTIONS.has(context.action)) {
    return 'toast';
  }
  if (error.kind === 'validation' && error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
    return 'inline';
  }
  if ((error.kind === 'permission' || error.kind === 'authentication') && (context.blocking ?? context.action === 'load')) {
    return 'page';
  }
  if (error.kind === 'network' && context.action === 'load') {
    return context.blocking === false ? 'banner' : 'page';
  }
  if (BANNER_ACTIONS.has(context.action)) {
    return 'banner';
  }
  if (error.kind === 'network' && error.retryable) {
    return 'banner';
  }
  return 'banner';
}

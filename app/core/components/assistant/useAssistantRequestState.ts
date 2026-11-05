'use client';

import { useCallback, useReducer } from 'react';

export type AssistantRequestState =
  | 'IDLE'
  | 'SUBMITTING'
  | 'THINKING'
  | 'TYPEWRITING'
  | 'COMPLETE'
  | 'PROVIDER_TIMEOUT'
  | 'RESPONSE_REJECTED'
  | 'REQUEST_FAILED';

type AssistantRequestEvent =
  | 'SUBMIT'
  | 'WAIT_FOR_RESPONSE'
  | 'REVEAL_RESPONSE'
  | 'FINISH'
  | 'PROVIDER_TIMED_OUT'
  | 'RESPONSE_WAS_REJECTED'
  | 'REQUEST_DID_FAIL'
  | 'RESET';

export function assistantRequestStateReducer(
  state: AssistantRequestState,
  event: AssistantRequestEvent,
): AssistantRequestState {
  switch (event) {
    case 'SUBMIT':
      return state === 'IDLE' || state === 'COMPLETE' || state.endsWith('FAILED')
        || state === 'PROVIDER_TIMEOUT' || state === 'RESPONSE_REJECTED'
        ? 'SUBMITTING'
        : state;
    case 'WAIT_FOR_RESPONSE':
      return state === 'SUBMITTING' ? 'THINKING' : state;
    case 'REVEAL_RESPONSE':
      return state === 'THINKING' ? 'TYPEWRITING' : state;
    case 'FINISH':
      return ['THINKING', 'TYPEWRITING', 'SUBMITTING'].includes(state) ? 'COMPLETE' : state;
    case 'PROVIDER_TIMED_OUT':
      return state === 'THINKING' ? 'PROVIDER_TIMEOUT' : state;
    case 'RESPONSE_WAS_REJECTED':
      return state === 'THINKING' ? 'RESPONSE_REJECTED' : state;
    case 'REQUEST_DID_FAIL':
      return state === 'THINKING' || state === 'SUBMITTING' ? 'REQUEST_FAILED' : state;
    case 'RESET':
      return 'IDLE';
  }
}

export function useAssistantRequestState() {
  const [requestState, dispatch] = useReducer(assistantRequestStateReducer, 'IDLE');
  return {
    requestState,
    beginRequest: useCallback(() => dispatch('SUBMIT'), []),
    markThinking: useCallback(() => dispatch('WAIT_FOR_RESPONSE'), []),
    markTypewriting: useCallback(() => dispatch('REVEAL_RESPONSE'), []),
    markComplete: useCallback(() => dispatch('FINISH'), []),
    markProviderTimeout: useCallback(() => dispatch('PROVIDER_TIMED_OUT'), []),
    markResponseRejected: useCallback(() => dispatch('RESPONSE_WAS_REJECTED'), []),
    markRequestFailed: useCallback(() => dispatch('REQUEST_DID_FAIL'), []),
    resetRequestState: useCallback(() => dispatch('RESET'), []),
  };
}

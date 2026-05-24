'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  buildAssistantPageContextSignature,
  haveAssistantActionRegistrationsChanged,
} from '@/app/core/components/assistant/assistantContextUtils';
import { useAssistant } from '@/app/core/components/assistant/AssistantProvider';
import type { AssistantPageContextRegistration } from '@/app/core/types/assistant';

export function useAssistantPageContext(context: AssistantPageContextRegistration): void {
  const { registerPageContext } = useAssistant();
  const previousContextRef = useRef<AssistantPageContextRegistration | null>(null);
  const previousSignatureRef = useRef<string>('');

  const contextSignature = useMemo(
    () => buildAssistantPageContextSignature(context),
    [context]
  );

  useEffect(() => {
    const previousContext = previousContextRef.current;
    const shouldRegister = previousSignatureRef.current !== contextSignature
      || haveAssistantActionRegistrationsChanged(previousContext, context);

    if (!shouldRegister) {
      return;
    }

    previousContextRef.current = context;
    previousSignatureRef.current = contextSignature;
    registerPageContext(context);
  }, [context, contextSignature, registerPageContext]);

  useEffect(() => () => {
    previousContextRef.current = null;
    previousSignatureRef.current = '';
    registerPageContext(null);
  }, [registerPageContext]);
}

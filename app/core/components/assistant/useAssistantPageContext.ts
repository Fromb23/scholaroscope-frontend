'use client';

import { useEffect, useMemo } from 'react';

import { useAssistant } from '@/app/core/components/assistant/AssistantProvider';
import type { AssistantPageContextRegistration } from '@/app/core/types/assistant';

export function useAssistantPageContext(context: AssistantPageContextRegistration): void {
  const { registerPageContext } = useAssistant();

  const stableContext = useMemo(() => context, [context]);

  useEffect(() => {
    registerPageContext(stableContext);
    return () => {
      registerPageContext(null);
    };
  }, [registerPageContext, stableContext]);
}


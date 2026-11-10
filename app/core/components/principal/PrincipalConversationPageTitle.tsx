'use client';

import { useSemanticPageTitle } from '@/app/core/pageIdentity/PageTitleProvider';

interface PrincipalConversationPageTitleProps {
  isBlank: boolean;
  title?: string | null;
  loading: boolean;
  unavailable: boolean;
}

export function principalConversationPageTitle({
  isBlank,
  title,
  loading,
  unavailable,
}: PrincipalConversationPageTitleProps): string {
  if (isBlank) return 'New conversation';
  if (title?.trim()) return title.trim();
  if (loading) return 'Opening conversation';
  if (unavailable) return 'Conversation unavailable';
  return 'Principal conversation';
}

export function PrincipalConversationPageTitle(
  props: PrincipalConversationPageTitleProps,
) {
  useSemanticPageTitle(principalConversationPageTitle(props));
  return null;
}

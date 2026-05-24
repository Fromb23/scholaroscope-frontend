import type { Role } from '@/app/core/types/auth';

export type AssistantActionType = 'navigate' | 'page_action' | 'feedback' | 'external' | 'chat_prompt';
export type AssistantConfidence = 'low' | 'medium' | 'high';
export type AssistantSuggestionPriority = 'low' | 'medium' | 'high';
export type AssistantFeedbackCategory = 'FEATURE_REQUEST' | 'BUG_REPORT';
export type AssistantResponseKind =
  | 'greeting'
  | 'identity'
  | 'capability'
  | 'page_help'
  | 'workflow'
  | 'clarification'
  | 'unsupported_feature'
  | 'unrelated_boundary';
export type AssistantResponseSource = 'deterministic' | 'classifier' | 'fallback';

export interface AssistantAction {
  label: string;
  type: AssistantActionType;
  href?: string;
  target?: string;
  prompt?: string;
}

export interface AssistantPageContext {
  pageKey?: string;
  pageTitle?: string;
  state?: Record<string, unknown>;
  visibleActions?: AssistantAction[];
  nextSafeAction?: AssistantAction;
  workflowStep?: string;
  emptyStateReason?: string;
}

export interface AssistantChatRequest {
  message: string;
  path: string;
  page_key?: string;
  role?: Role | null;
  context?: {
    page_title?: string;
    state?: Record<string, unknown>;
    visible_actions?: AssistantAction[];
  };
}

export interface AssistantChatResponse {
  message: string;
  actions: AssistantAction[];
  unsupported: boolean;
  confidence: AssistantConfidence;
  response_kind?: AssistantResponseKind;
  source?: AssistantResponseSource;
  workflow_intent?: string;
  follow_up_prompts?: string[];
}

export interface AssistantSuggestion {
  id: string;
  priority: AssistantSuggestionPriority;
  message: string;
  actions: AssistantAction[];
}

export interface AssistantSuggestRequest {
  path: string;
  page_key?: string;
  role?: Role | null;
  context?: {
    page_title?: string;
    state?: Record<string, unknown>;
    visible_actions?: AssistantAction[];
  };
}

export interface AssistantSuggestResponse {
  suggestions: AssistantSuggestion[];
}

export interface AssistantFeedbackPayload {
  title: string;
  description: string;
  category: AssistantFeedbackCategory;
  path: string;
  role?: Role | null;
  context?: {
    source?: string;
    page_key?: string;
    user_message?: string;
  };
}

export interface AssistantFeedbackResponse {
  id: number;
  message: string;
}

export interface AssistantPageActionRegistration extends AssistantAction {
  type: 'page_action' | 'navigate';
  handler?: () => void;
}

export interface AssistantPageContextRegistration {
  pageKey?: string;
  pageTitle?: string;
  state?: Record<string, unknown>;
  visibleActions?: AssistantPageActionRegistration[];
  nextSafeAction?: AssistantPageActionRegistration;
  workflowStep?: string;
  emptyStateReason?: string;
}

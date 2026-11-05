import type { OperatingContext } from '@/app/core/types/auth';
import type { PaginatedResponse } from '@/app/core/types/api';

export interface AssistantConversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  context_revision: number;
  context: AssistantConversationContext;
}

export interface AssistantAcademicContextEntity {
  id: number;
  name: string;
}

export type AssistantTermLifecycleStatus =
  | 'OPEN'
  | 'ENDED_GRACE_PERIOD'
  | 'CLOSING'
  | 'CLOSED_HISTORICAL';

export interface AssistantTermContext extends AssistantAcademicContextEntity {
  status: AssistantTermLifecycleStatus;
}

export interface AssistantConversationContext {
  academic_year: AssistantAcademicContextEntity | null;
  term: AssistantTermContext | null;
  cohorts: AssistantAcademicContextEntity[] | null;
  subject: AssistantAcademicContextEntity | null;
  domain: string | null;
  intent: string | null;
}

export type AssistantConversationListResponse = PaginatedResponse<AssistantConversation>;

export type AssistantMessageRole = 'USER' | 'ASSISTANT';

export interface AssistantMarkdownBlock {
  type: 'markdown';
  text: string;
}

export interface AssistantMetricsBlock {
  type: 'metrics';
  values: Record<string, number>;
}

export interface AssistantTableBlock {
  type: 'table';
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
}

export interface AssistantActionsBlock {
  type: 'actions';
  actions: AssistantAction[];
}

export interface AssistantClarificationBlock {
  type: 'clarification';
  question: string;
}

export interface AssistantUnsupportedCapabilityBlock {
  type: 'unsupported_capability';
  code: string;
  message: string;
}

export interface AssistantErrorBlock {
  type: 'error';
  code: string;
  message: string;
}

export type AssistantResponseBlock =
  | AssistantMarkdownBlock
  | AssistantMetricsBlock
  | AssistantTableBlock
  | AssistantActionsBlock
  | AssistantClarificationBlock
  | AssistantUnsupportedCapabilityBlock
  | AssistantErrorBlock;

export interface AssistantMessage {
  id: number;
  role: AssistantMessageRole;
  content_blocks: AssistantResponseBlock[];
  client_request_id: string | null;
  created_at: string;
}

export interface AssistantMessageCreatePayload {
  message: string;
  client_request_id: string;
}

export interface AssistantConversationMessageResponse {
  schema_version: string;
  conversation: AssistantConversation;
  user_message: AssistantMessage;
  assistant_message: AssistantMessage | null;
}

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
  operating_context?: OperatingContext | null;
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
  operating_context?: OperatingContext | null;
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
  operating_context?: OperatingContext | null;
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

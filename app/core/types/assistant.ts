import type { OperatingContext } from '@/app/core/types/auth';
import type { PaginatedResponse } from '@/app/core/types/api';

export interface AssistantConversation {
  id: number;
  title: string;
  title_kind: 'PROVISIONAL' | 'AUTOMATIC' | 'MANUAL';
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
  rows: Array<Record<string, string | number | boolean | null>>;
}

export interface AssistantDetailsBlock {
  type: 'details';
  items: Array<{
    label: string;
    value: string | number | boolean | null;
  }>;
}

export interface AssistantNoticeBlock {
  type: 'notice';
  tone: 'info' | 'warning';
  title?: string;
  text: string;
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
  presentation_owner?: 'SERVER';
  model_context_retained?: boolean;
  capability_context?: {
    outcome: 'OPERATION_UNAVAILABLE';
    requested_operation: string;
    limitation: string;
    scope_labels: Array<{
      label: string;
      entity_type: 'LEVEL' | 'COHORT' | 'SUBJECT' | 'DATE' | 'TERM' | 'OTHER';
      source: 'USER_PROVIDED' | 'INFERRED';
    }>;
    supported_alternative: {
      description: string;
      required_scope_labels: string[];
    } | null;
  };
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
  | AssistantDetailsBlock
  | AssistantNoticeBlock
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
  run_id: number;
  status: AssistantRunStatus;
  execution_stage: AssistantExecutionStage;
  turn: AssistantTurn;
}

export type AssistantRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'SUCCEEDED' | 'FAILED' | 'UNSUPPORTED';
export type AssistantExecutionStage =
  | 'RECEIVED' | 'INTERPRETING' | 'RESOLVING_CONTEXT' | 'WAITING_FOR_PROVIDER'
  | 'SELECTING_TOOL' | 'CLARIFICATION_REQUIRED' | 'TOOL_RUNNING'
  | 'COMPOSING_RESPONSE' | 'COMPLETED' | 'FAILED';

export interface AssistantRunDiagnostics {
  run_id: number;
  stage: AssistantExecutionStage;
  failure_code: string | null;
  retryable: boolean;
  latency_ms: number;
  provider?: string | null;
  model?: string | null;
  http_status?: number | null;
  provider_retry_count?: number;
  provider_call_count?: number;
  tool_selected: string | null;
  tool_executed: boolean;
  semantics?: {
    dictionary_version: string | null;
    concept_keys: string[];
    entry_count: number;
    payload_bytes: number;
  };
}

export interface AssistantRun {
  id: number;
  status: AssistantRunStatus;
  execution_stage: AssistantExecutionStage;
  attempt_number: number;
  retryable: boolean;
  assistant_message: AssistantMessage | null;
  diagnostics?: AssistantRunDiagnostics;
}

export interface AssistantTurnAttempt {
  id: number;
  attempt_number: number;
  status: AssistantRunStatus;
  execution_stage: AssistantExecutionStage;
  retryable: boolean;
  response_message_id: number | null;
  previous_run_id: number | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AssistantTurn {
  id: number;
  user_message: AssistantMessage;
  current_run: AssistantRun | null;
  current_response: AssistantMessage | null;
  retry_allowed: boolean;
  retry_target_run_id: number | null;
  attempts: AssistantTurnAttempt[];
}

export interface AssistantTurnHistory {
  schema_version: 'assistant.turns.v1';
  turns: AssistantTurn[];
  legacy_unlinked_messages: AssistantMessage[];
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

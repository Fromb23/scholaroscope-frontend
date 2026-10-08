export type ProjectDeploymentStatus =
  | 'DRAFT'
  | 'READY'
  | 'PUBLISHED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FINALIZED'
  | 'ARCHIVED'
  | 'CANCELLED';

export interface ProjectAuthority {
  can_view: boolean;
  can_supervise: boolean;
  can_manage: boolean;
  can_publish: boolean;
  can_start: boolean;
  can_complete: boolean;
  can_administer: boolean;
  can_record_evidence: boolean;
  can_evaluate: boolean;
  can_finalize: boolean;
  can_update_checklist: boolean;
  can_cancel: boolean;
  can_export: boolean;
  allowed_actions: string[];
  blocked_reason_codes: Record<string, string>;
}

export type ProjectCatalogueScope =
  | 'PLATFORM_OFFICIAL'
  | 'ORGANIZATION_CUSTOM'
  | 'LEGACY_UNCLASSIFIED';

export interface EligibleProjectTarget {
  id: number;
  cohort: { id: number; name: string };
  subject: { id: number; name: string };
  academic_year: number;
  can_deploy: boolean;
}

export interface ProjectCatalogueAuthority {
  can_view: boolean;
  can_deploy: boolean;
  can_edit_definition: boolean;
  can_verify_official: false;
}

export interface ProjectTaskStep {
  id: number;
  parent: number | null;
  number: string;
  title: string;
  instructions: string;
  order: number;
}
export interface ProjectCriterion {
  id: number;
  code: string;
  description: string;
  maximum_marks: string;
  order: number;
}
export interface ProjectTask {
  id: number;
  code: string;
  title: string;
  instructions: string;
  order: number;
  maximum_marks: string;
  steps: ProjectTaskStep[];
  criteria: ProjectCriterion[];
  evidence_requirements: Array<{
    id: number;
    step: number | null;
    evidence_type: string;
    description: string;
    required: boolean;
  }>;
  curriculum_mappings: Array<Record<string, unknown>>;
  dependencies: Array<{ task: number; task_code: string; required_artifact_key: string }>;
}

export interface ProjectAdoption {
  id: number;
  decision: string;
  status: string;
  verified_at: string | null;
}
export interface ProjectDefinitionVersion {
  id: number;
  catalogue_scope: ProjectCatalogueScope;
  owning_organization: number | null;
  canonical_key: string;
  curriculum_key: string;
  authority_key: string;
  subject_key: string;
  level_key: string;
  assessment_year: number;
  assessment_code: string;
  version: number;
  title: string;
  summary: string;
  maximum_marks: string;
  collaboration_mode: string;
  submission_ownership: string;
  assessment_ownership: string;
  maximum_group_size: number | null;
  detailed_rubric_required: boolean;
  scoring_guide_referenced: boolean;
  status: string;
  verification_tier: string;
  definition_checksum: string;
  tasks: ProjectTask[];
  resources: Array<Record<string, string>>;
  safety_instructions: Array<{ instruction: string; required: boolean }>;
  administration_instructions: Array<{ instruction: string; required: boolean }>;
  source_provenance: Array<Record<string, unknown>>;
  aggregate_verification_count: number;
  organization_adoption: ProjectAdoption | null;
  eligible_cohort_subjects: EligibleProjectTarget[];
  authority: ProjectCatalogueAuthority;
}

export interface ProjectDeploymentProgress {
  task_count: number;
  completed_task_count: number;
  evidence_count: number;
  evaluation_count: number;
}
export interface ProjectDeployment {
  id: number;
  definition_version: number;
  definition?: ProjectDefinitionVersion;
  title: string;
  definition_checksum?: string;
  academic_year: number;
  cohort_subject: number;
  subject: { id: number; name: string; code: string };
  cohort: { id: number; name: string; level: string };
  administering_instructor: number;
  administering_instructor_name: string;
  scheduled_start: string;
  scheduled_end: string;
  submission_deadline: string | null;
  local_operational_instructions?: string;
  status: ProjectDeploymentStatus;
  published_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  finalized_at?: string | null;
  created_at?: string;
  participant_count: number;
  progress: ProjectDeploymentProgress;
  readiness: { state: string; incomplete_required_checklist_items: number[] };
  task_executions?: Array<{
    id: number;
    task: number;
    status: string;
    started_at: string | null;
    submitted_at: string | null;
    finalized_at: string | null;
  }>;
  administration?: {
    id: number;
    state: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    actual_start: string | null;
    actual_end: string | null;
    venue: string;
    lead_assessor: number;
  } | null;
  lifecycle_history?: Array<{ status: string; at: string }>;
  authority: ProjectAuthority;
}

export interface ProjectParticipant {
  id: number;
  deployment: number;
  learner: number;
  learner_name: string;
  inclusion_reason: string;
  included_at: string;
  is_late_addition: boolean;
  status: string;
  withdrawn_at: string | null;
}
export interface ProjectGroup {
  id: number;
  deployment: number;
  name: string;
  created_at: string;
  members: Array<{
    id: number;
    participant: number;
    learner: number;
    role: string;
    participation_status: string;
  }>;
}
export interface ProjectEvidence {
  id: number;
  deployment: number;
  task: number;
  task_step: number | null;
  group: number | null;
  learner: number | null;
  evidence_type: string;
  file: string | null;
  structured_observation: Record<string, unknown>;
  submitted_at: string;
  observed_at: string;
  content_hash: string;
  status: string;
  locked_at: string | null;
  retention_date: string | null;
  provenance: Record<string, unknown>;
  supersedes: number | null;
}
export interface ProjectCriterionScore {
  id: number;
  criterion: number;
  awarded_marks: string;
  feedback: string;
}
export interface ProjectTaskEvaluation {
  id: number;
  deployment: number;
  task: number;
  participant: number;
  evaluator: number;
  status: string;
  teacher_feedback: string;
  derived_score: string;
  observed_at: string;
  finalized_at: string | null;
  evidence_projection_status: string;
  evidence_projection_warning: string;
  criterion_scores: ProjectCriterionScore[];
  project_total: string;
}
export interface ProjectResultSummary {
  participant: number;
  learner: number;
  learner_name: string;
  participation_status: string;
  project_score: string | number;
  finalized_task_count: number;
}
export interface ProjectChecklistItem {
  id: number;
  category: string;
  label: string;
  required: boolean;
  completed: boolean;
  completed_at: string | null;
}
export interface ProjectImportJob {
  id: number;
  catalogue_scope: 'ORGANIZATION_CUSTOM';
  original_filename: string;
  document_kind: string;
  uploaded_at: string;
  claimed_authority: string;
  claimed_curriculum: string;
  claimed_assessment_year: number | null;
  extraction_status: string;
  extraction_warnings: string[];
  extracted_draft: Record<string, unknown>;
  failure_code: string;
  safe_failure_message: string;
  confirmed_at: string | null;
}

export interface CreateProjectDeploymentPayload {
  definition_version: number;
  cohort_subject: number;
  academic_year: number;
  scheduled_start: string;
  scheduled_end: string;
  submission_deadline?: string;
  local_operational_instructions?: string;
}
export interface ProjectServerError {
  code?: string;
  message?: string;
  field_errors?: Record<string, string[]>;
  context?: Record<string, unknown>;
  correlation_id?: string;
}
export interface ProjectFilters {
  status?: string;
  subject?: number;
  cohort?: number;
  academic_year?: number;
  page?: number;
}

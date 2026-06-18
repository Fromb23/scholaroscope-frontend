export type IntelligenceStatus =
  | 'ON_TRACK'
  | 'DEVELOPING'
  | 'NEEDS_SUPPORT'
  | 'NEEDS_MORE_EVIDENCE'
  | 'BASELINE_REQUIRED'
  | 'CATCH_UP_NEEDED'
  | 'UNKNOWN';

export type EvidenceConfidenceLevel = 'HIGH' | 'MODERATE' | 'LIMITED';

export type TrendDirection =
  | 'IMPROVING'
  | 'STABLE'
  | 'DECLINING'
  | 'VOLATILE'
  | 'TOO_EARLY_TO_TELL'
  | 'INSUFFICIENT_EVIDENCE';

export interface AcademicIntelligenceAction {
  type: string;
  message: string;
}

export interface AcademicContributingFactor {
  type: string;
  confidence: EvidenceConfidenceLevel;
  message: string;
}

export interface AcademicOutcomeRef {
  id: number;
  code: string;
  description: string;
  strand?: string;
  sub_strand?: string;
  evidence_count?: number;
  status?: IntelligenceStatus;
}

export interface AcademicEvidenceDetail {
  event_id?: string;
  source_type: string;
  source_id?: number | null;
  label: string;
  event_date: string | null;
  score?: number | null;
  outcome_id?: number | null;
  outcome_code?: string | null;
  direct?: boolean;
  message: string;
}

export interface LearnerSubjectIntelligence {
  scope: {
    learner_id: number;
    learner_name: string;
    admission_number: string;
    cohort_subject_id: number;
    cohort_id: number;
    cohort_name: string;
    subject_id: number;
    subject_name: string;
    subject_code: string;
    term_id: number;
    term_name: string;
  };
  status: IntelligenceStatus;
  status_label: string;
  current_picture: string;
  achievement: {
    band: IntelligenceStatus;
    score: number | null;
  };
  confidence: {
    level: EvidenceConfidenceLevel;
    label: string;
    evidence_count: number;
    mapped_evidence_count: number;
    independent_sources: number;
    message: string;
  };
  trend: {
    direction: TrendDirection;
    label: string;
    message: string;
  };
  participation: {
    attendance_status: string | null;
    attendance_message: string | null;
    assignment_completion_status: string | null;
    assignment_message: string | null;
  };
  outcomes: {
    strongest: AcademicOutcomeRef[];
    developing: AcademicOutcomeRef[];
    unknown: AcademicOutcomeRef[];
    baseline_required: AcademicOutcomeRef[];
  };
  possible_contributing_factors: AcademicContributingFactor[];
  recommended_actions: AcademicIntelligenceAction[];
  official_result: {
    available: boolean;
    result_status?: string | null;
    is_final?: boolean;
    is_stale?: boolean;
    message: string;
    cbc_level?: string | null;
    cbc_code?: string | null;
    cbc_points?: number | null;
    not_awarded_message?: string;
  };
  why?: {
    observed_pattern?: string;
    confidence_basis?: string;
    rules_used?: string[];
    excluded_events?: unknown[];
  };
  evidence_details?: AcademicEvidenceDetail[];
  evidence_detail_available: boolean;
  computed_at: string | null;
  source_version: string;
  visibility: 'instructor' | 'admin' | 'learner' | 'parent';
}

export interface ClassSubjectIntelligence {
  scope: {
    cohort_subject_id: number;
    cohort_id: number;
    cohort_name: string;
    subject_id: number;
    subject_name: string;
    subject_code: string;
    term_id: number;
    term_name: string;
  };
  status: IntelligenceStatus;
  status_label: string;
  class_learning_picture: string;
  evidence_confidence_distribution: Record<string, number>;
  most_secure_outcomes: AcademicOutcomeRef[];
  outcomes_needing_reteaching: AcademicOutcomeRef[];
  outcomes_with_insufficient_evidence: AcademicOutcomeRef[];
  participation_and_evidence_quality: Record<string, unknown>;
  learners_needing_targeted_support: Array<Record<string, unknown>>;
  learners_needing_more_evidence: Array<Record<string, unknown>>;
  learners_needing_baseline: Array<Record<string, unknown>>;
  suggested_next_teaching_action: AcademicIntelligenceAction[];
  computed_at: string | null;
  source_version: string;
  visibility: 'instructor' | 'admin';
}

export interface TermIntelligence {
  scope: {
    organization_id: number;
    organization_name: string;
    term_id: number;
    term_name: string;
  };
  final_result_readiness: number | null;
  result_distribution: Record<string, number>;
  late_entry_exclusions: number;
  baseline_pending_learners: number;
  outcome_coverage: Record<string, unknown>;
  evidence_confidence_distribution: Record<string, number>;
  class_trends: Array<Record<string, unknown>>;
  subject_trends: Array<Record<string, unknown>>;
  intervention_response: Record<string, unknown>;
  data_quality_warnings: AcademicIntelligenceAction[];
  recommended_actions: AcademicIntelligenceAction[];
  computed_at: string | null;
  source_version: string;
  visibility: 'admin';
}

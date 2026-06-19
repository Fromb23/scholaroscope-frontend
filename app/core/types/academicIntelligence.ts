export type IntelligenceStatus =
  | 'ON_TRACK'
  | 'DEVELOPING'
  | 'NEEDS_SUPPORT'
  | 'NEEDS_MORE_EVIDENCE'
  | 'BASELINE_REQUIRED'
  | 'CATCH_UP_NEEDED'
  | 'UNKNOWN';

export type EvidenceConfidenceLevel = 'HIGH' | 'MODERATE' | 'LIMITED';

export type OutcomeExposureStatus =
  | 'NOT_IN_RECORDED_TEACHING_SCOPE'
  | 'TAUGHT_NO_DIRECT_EVIDENCE'
  | 'LIMITED_DIRECT_EVIDENCE'
  | 'SUFFICIENT_DIRECT_EVIDENCE'
  | 'BROAD_SUBJECT_EVIDENCE_ONLY';

export type EvidenceGapReason =
  | 'NONE'
  | 'NO_DIRECT_LEARNER_EVIDENCE'
  | 'LOW_LEARNER_COVERAGE'
  | 'INSUFFICIENT_INDEPENDENT_SOURCES'
  | 'BROAD_SUBJECT_SIGNAL_ONLY'
  | 'NOT_IN_RECORDED_SCOPE';

export type TeachingPriorityState =
  | 'COLLECT_EVIDENCE'
  | 'RETHINK_EXPOSURE'
  | 'RETEACH'
  | 'MONITOR'
  | 'NO_ACTION';

export type TeachingPriorityActionType =
  | 'EXIT_TASK'
  | 'QUICK_DIAGNOSTIC'
  | 'RETEACH'
  | 'RECORD_EVIDENCE'
  | 'NONE';

export type TermResolution = 'EXPLICIT' | 'CURRENT_TERM_DEFAULT';

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

export interface OutcomeRecordedExposureSource {
  type: 'COMPLETED_SESSION' | 'ASSIGNMENT' | 'DIRECT_EVIDENCE';
  label: string;
  date: string | null;
}

export interface OutcomeTeachingPriority extends AcademicOutcomeRef {
  exposure_status: OutcomeExposureStatus;
  evidence_gap_reason: EvidenceGapReason;
  evidence_confidence: EvidenceConfidenceLevel;
  performance_signal:
    | 'SUPPORTED_WEAK'
    | 'SUPPORTED_SECURE'
    | 'INSUFFICIENT_DIRECT_EVIDENCE'
    | 'BROAD_SUBJECT_ONLY'
    | 'NOT_IN_SCOPE'
    | 'MIXED';
  class_score: number | null;
  weak_learner_count: number;
  secure_learner_count: number;
  eligible_learner_count: number;
  learners_with_direct_evidence: number;
  coverage_percent: number;
  direct_evidence_count: number;
  independent_source_count: number;
  recorded_exposure_sources: OutcomeRecordedExposureSource[];
  recommended_action: string;
}

export interface TeachingPriority {
  state: TeachingPriorityState;
  headline: string;
  why_it_matters: string;
  confidence: EvidenceConfidenceLevel;
  recommended_action: {
    type: TeachingPriorityActionType;
    message: string;
  };
  priority_outcomes: OutcomeTeachingPriority[];
  supporting_counts: {
    outcomes_in_recorded_scope: number;
    outcomes_not_in_recorded_scope: number;
    outcomes_needing_evidence: number;
    outcomes_needing_reteaching: number;
    outcomes_with_broad_subject_evidence_only: number;
  };
}

export interface ClassSubjectIntelligenceSupportingDetail {
  secure_outcomes: OutcomeTeachingPriority[];
  outcomes_not_in_recorded_scope: OutcomeTeachingPriority[];
  broad_subject_evidence_only_outcomes: OutcomeTeachingPriority[];
  subject_context: {
    assessment_count?: number;
    learners_with_scores?: number;
    average_score?: number | null;
    message?: string;
  };
  class_participation: {
    eligible_learner_count?: number;
    learners_needing_targeted_support?: number;
    learners_needing_more_evidence?: number;
    learners_needing_baseline?: number;
  };
  learners_needing_targeted_support: Array<{
    learner_id: number;
    learner_name: string;
    admission_number: string;
    status: IntelligenceStatus;
    confidence: EvidenceConfidenceLevel;
    trend: TrendDirection;
    message: string;
  }>;
  learners_needing_more_evidence: Array<{
    learner_id: number;
    learner_name: string;
    admission_number: string;
    status: IntelligenceStatus;
    confidence: EvidenceConfidenceLevel;
    trend: TrendDirection;
    message: string;
  }>;
  learners_needing_baseline: Array<{
    learner_id: number;
    learner_name: string;
    admission_number: string;
    status: IntelligenceStatus;
    confidence: EvidenceConfidenceLevel;
    trend: TrendDirection;
    message: string;
  }>;
  evidence_confidence_distribution: Record<EvidenceConfidenceLevel, number>;
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
    term_resolution?: TermResolution | null;
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
    term_resolution: TermResolution | null;
  };
  status: IntelligenceStatus;
  status_label: string;
  class_learning_picture: string;
  teaching_priority: TeachingPriority;
  supporting_detail: ClassSubjectIntelligenceSupportingDetail;
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

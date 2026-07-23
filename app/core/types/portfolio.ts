export interface PortfolioRef {
  id: number;
  name?: string;
  code?: string;
  label?: string;
  [key: string]: unknown;
}

export interface PortfolioLearnerRef {
  id: number;
  name: string;
  admission_number?: string | null;
  current_cohort?: PortfolioRef | null;
  current_enrolment?: PortfolioRef | null;
}

export interface PortfolioScope {
  organization: PortfolioRef | null;
  academic_year: PortfolioRef | null;
  term: PortfolioRef | null;
}

export interface PortfolioLearningArea {
  id: number | null;
  cohort_subject_id?: number | null;
  cbc_cohort_subject_id?: number | null;
  name: string;
  code?: string;
  cohort?: PortfolioRef | null;
}

export interface PortfolioLearningOutcome {
  id: number;
  code: string;
  description: string;
  strand?: string;
  sub_strand?: string;
}

export interface PortfolioCompetencyJudgement {
  level: string;
  label: string;
  rubric_level_id?: number | null;
}

export interface PortfolioArtifact {
  id?: number | string | null;
  name?: string | null;
  filename?: string | null;
  url?: string | null;
  download_url?: string | null;
  preview_url?: string | null;
  content_type?: string | null;
  size?: number | null;
  missing?: boolean;
  accessible?: boolean;
}

export interface PortfolioOfficialSnapshotReference {
  snapshot_id: number;
  title?: string | null;
  term?: PortfolioRef | null;
  cohort_subject_id?: number | null;
  published_at?: string | null;
  is_current?: boolean;
  outcome_code?: string | null;
}

export interface PortfolioSourceRoute {
  kind: string;
  id: number;
  href?: string | null;
  label?: string | null;
}

export interface PortfolioEvidence {
  evidence_record_id: number;
  source_type: string;
  source_id?: number | string | null;
  title: string;
  evidence_date: string | null;
  learning_area: PortfolioLearningArea | null;
  learning_outcome: PortfolioLearningOutcome | null;
  competency_judgement: PortfolioCompetencyJudgement | null;
  teacher_feedback_summary?: string | null;
  teacher_feedback?: string | null;
  learner_work?: string | Record<string, unknown> | null;
  learner_reflection?: string | null;
  artifacts: PortfolioArtifact[];
  artifact_missing?: boolean;
  provenance?: Record<string, unknown> | null;
  responsible_teacher?: PortfolioRef | null;
  official_snapshot_references: PortfolioOfficialSnapshotReference[];
  source_route?: PortfolioSourceRoute | null;
  learner_context?: Record<string, unknown> | null;
  source_context?: Record<string, unknown> | null;
}

export interface PortfolioSummary {
  total_evidence: number;
  learning_area_count: number;
  outcome_count: number;
  latest_evidence_at: string | null;
  source_distribution: Record<string, number>;
}

export interface LearnerPortfolioFilters {
  academic_year?: number | null;
  term?: number | null;
  cohort_subject?: number | null;
  outcome?: number | null;
  source?: string | null;
  page?: number | null;
}

export interface LearnerPortfolioFilterState {
  applied: LearnerPortfolioFilters;
  available_sources: string[];
  represented_learning_areas?: PortfolioLearningArea[];
  represented_outcomes?: PortfolioLearningOutcome[];
}

export interface PortfolioPagination {
  page: number;
  page_size: number;
  count: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
}

export interface LearnerPortfolioPayload {
  learner: PortfolioLearnerRef;
  scope: PortfolioScope;
  summary: PortfolioSummary;
  filters: LearnerPortfolioFilterState;
  results: PortfolioEvidence[];
  pagination: PortfolioPagination;
}

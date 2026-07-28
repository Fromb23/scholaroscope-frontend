export type RevenuePolicyStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';
export type RevenueCycleStatus = 'DRAFT' | 'OPEN' | 'CALCULATED' | 'UNDER_REVIEW' | 'APPROVED' | 'CLOSED';
export type CalculationRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';
export type StatementReviewState = 'PENDING' | 'REVIEWED' | 'FLAGGED';

export interface TeacherContributionTier {
  minimum_ratio: string;
  maximum_ratio: string;
  projected_amount: string;
  label?: string;
}

export interface RevenueBlocker {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export interface ProjectedBalanceSummary {
  projected_gross_learner_contribution: string;
  projected_total_teacher_contribution: string;
  projected_balance: string;
  state: 'SURPLUS' | 'BALANCED' | 'DEFICIT';
}

export interface RevenueOverviewTerm {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

export interface InstitutionRevenuePolicy {
  id: string;
  organization: number;
  version: number;
  currency: string;
  learner_contribution_amount: string;
  minimum_learner_contribution_amount: string;
  teacher_payout_tiers: TeacherContributionTier[];
  effective_term: number | null;
  effective_term_name?: string | null;
  effective_date: string | null;
  status: RevenuePolicyStatus;
  active_scope_key?: string | null;
  created_by_name?: string | null;
  activated_by_name?: string | null;
  activated_at?: string | null;
  retired_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevenuePolicyPayload {
  learner_contribution_amount: string;
  minimum_learner_contribution_amount?: string;
  teacher_payout_tiers: TeacherContributionTier[];
  effective_term?: number | null;
  effective_date?: string | null;
  currency?: string;
}

export interface InstitutionRevenueCycle {
  id: string;
  organization: number;
  academic_term: number;
  term_name?: string | null;
  subscription_period: number | null;
  policy: string | null;
  policy_snapshot: Record<string, unknown>;
  policy_snapshot_hash: string;
  learner_contribution_amount_snapshot: string;
  roster_snapshot_at: string | null;
  status: RevenueCycleStatus;
  projected_eligible_learner_count: number;
  projected_gross_contribution: string;
  projected_balance_summary: ProjectedBalanceSummary;
  latest_run_id: string | null;
  calculation_metadata: Record<string, unknown>;
  status_transition_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RevenueCycleOverview {
  overview_state: 'NO_CURRENT_TERM' | 'CURRENT_TERM_WITHOUT_CYCLE' | 'CURRENT_TERM_WITH_CYCLE';
  current_term: RevenueOverviewTerm | null;
  active_revenue_cycle: InstitutionRevenueCycle | null;
  cycle_status?: RevenueCycleStatus;
  projected_learner_contribution?: string;
  eligible_learner_seat_count?: number;
  projected_gross_contribution?: string;
  eligible_teacher_count?: number;
  projected_total_teacher_contribution?: string;
  projected_balance_summary?: ProjectedBalanceSummary;
  compliance_blocker_summary?: RevenueBlocker[];
  latest_calculation_timestamp?: string | null;
  blockers?: RevenueBlocker[];
}

export interface RosterProjectionSummary {
  cycle: string;
  totals: Array<{ inclusion_state: 'INCLUDED' | 'EXCLUDED'; count: number }>;
  projected_eligible_learner_count: number;
  projected_gross_contribution: string;
  results: Array<{ learner: number; inclusion_state: string; exclusion_reason?: string | null }>;
}

export interface InstitutionRevenueCalculationRun {
  id: string;
  cycle: string;
  run_number: number;
  formula_version: string;
  status: CalculationRunStatus;
  started_at: string | null;
  completed_at: string | null;
  initiated_by_name?: string | null;
  aggregate_projected_results: {
    eligible_teacher_count?: number;
    projected_total_teacher_contribution?: string;
    projected_balance_summary?: ProjectedBalanceSummary;
    blockers?: RevenueBlocker[];
    [key: string]: unknown;
  };
  diagnostics: Record<string, unknown>;
  superseded_run: string | null;
  created_at: string;
}

export interface TeacherContributionStatement {
  id: string;
  cycle: string;
  calculation_run: string;
  teacher: number;
  teacher_name?: string | null;
  active_assignment_count: number;
  eligible_scheme_entry_count: number;
  verified_scheme_entry_count: number;
  scheme_implementation_ratio: string;
  assessment_compliance_result: {
    passed?: boolean;
    blockers?: RevenueBlocker[];
    [key: string]: unknown;
  };
  missing_required_assessment_components: unknown[];
  matched_policy_tier: TeacherContributionTier | null;
  projected_amount: string;
  calculation_details: Record<string, unknown> & { blockers?: RevenueBlocker[] };
  review_state: StatementReviewState;
  reviewer_name?: string | null;
  reviewed_at?: string | null;
  review_note?: string;
  created_at: string;
}

export interface SchemeEntryOption {
  id: number;
  label: string;
  scheme: number;
  lesson?: number | null;
  strand?: string | null;
  sub_strand?: string | null;
  lesson_learning_outcomes?: string | null;
}

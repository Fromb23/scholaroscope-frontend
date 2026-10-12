export type GroupingContextType = 'project' | 'assignment';

export interface GroupingLearner {
  id: number;
  full_name: string;
  admission_number: string;
  gender?: string | null;
}

export interface SharedGroup {
  id: number;
  name: string;
  notes: string;
  position: number;
  members: GroupingLearner[];
}

export interface SharedGroupSet {
  id: number;
  revision: number;
  status: string;
  reconciliation_status: string;
  reconciliation_error: string;
  population_label: string;
  groups: SharedGroup[];
}

export interface GroupingContextResponse {
  context: {
    type: GroupingContextType;
    id: number;
    title: string;
    population_label: string;
    cohort_subject_ids: number[];
  };
  capabilities: {
    can_view: boolean;
    can_manage: boolean;
    can_reconcile: boolean;
  };
  eligible_learners: GroupingLearner[];
  counts: { eligible: number; assigned: number; unassigned: number };
  group_set: SharedGroupSet | null;
  legacy: {
    status: string;
    legacy_group_count: number;
    unreconciled_group_count: number;
    empty_group_count: number;
    label: string;
  };
  lock: {
    is_locked: boolean;
    lock_reason_code: string | null;
    lock_reason: string | null;
    evidence_count: number;
    evaluation_count: number;
    dependencies: Array<Record<string, number | string>>;
  };
}

export interface GroupingDraftGroup {
  id?: number;
  clientId: string;
  name: string;
  notes: string;
  studentIds: number[];
}

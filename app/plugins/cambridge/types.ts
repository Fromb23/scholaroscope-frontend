// ============================================================================
// app/plugins/cambridge/types.ts
//
// Backend-aligned Cambridge API contracts.
// ============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type ListResponse<T> = T[] | PaginatedResponse<T>;

export interface CambridgeInstallation {
  id: number;
  provider_key: string;
  enabled: boolean;
  config_json: Record<string, unknown>;
  programme_count: number;
  enabled_subject_count: number;
  created_at: string;
  updated_at: string;
}

export interface CambridgeInstallationProgramme {
  id: number;
  programme_id: number;
  code: string;
  title: string;
  structure_mode: string;
  display_stage_range: string;
  enabled: boolean;
}

export interface CambridgeFrameworkVersionSummary {
  id: number;
  version_label: string;
  effective_from: number;
  effective_to: number | null;
  is_current: boolean;
}

export interface CambridgeSyllabusVersionSummary {
  id: number;
  title: string;
  version_label: string;
  valid_from_year: number;
  valid_to_year: number | null;
  is_current: boolean;
}

export interface CambridgeSubjectOffering {
  id: number;
  installation_programme_id: number;
  programme_id: number;
  programme_code: string;
  programme_title: string;
  subject_profile_id: number;
  subject_title: string;
  subject_code: string;
  structure_mode: string;
  active_framework: CambridgeFrameworkVersionSummary | null;
  active_syllabus: CambridgeSyllabusVersionSummary | null;
  is_active: boolean;
}

export interface CambridgeAvailableSubjectProfile {
  id: number;
  title: string;
  subject_code: string;
  structure_mode: string;
  frameworks: CambridgeFrameworkVersionSummary[];
  syllabuses: CambridgeSyllabusVersionSummary[];
  offered_subject_id: number | null;
  active_framework: CambridgeFrameworkVersionSummary | null;
  active_syllabus: CambridgeSyllabusVersionSummary | null;
}

export interface CambridgeProgrammeSubjectsResponse {
  programme: CambridgeInstallationProgramme;
  available_subjects: CambridgeAvailableSubjectProfile[];
  offered_subjects: CambridgeSubjectOffering[];
}

export interface CambridgeSubjectOfferingCreatePayload {
  subject_profile: number;
  active_framework?: number | null;
  active_syllabus?: number | null;
}

export interface CambridgeSubjectOfferingUpdatePayload {
  active_framework?: number | null;
  active_syllabus?: number | null;
  is_active?: boolean;
}

export interface CambridgeCohortSubject {
  id: number;
  cohort: number;
  cohort_name: string;
  cohort_level: string;
  offering_id: number;
  programme_code: string;
  subject_title: string;
  subject_code: string;
  structure_mode: string;
  active_framework: CambridgeFrameworkVersionSummary | null;
  active_syllabus: CambridgeSyllabusVersionSummary | null;
  is_active: boolean;
}

export interface CambridgeAssignOfferingToCohortPayload {
  cohort: number;
}

export interface CambridgeInstallationSubject {
  id: number;
  subject_id: number;
  subject_name: string;
  catalogue_title: string | null;
  subject_code: string | null;
  programme_code: string | null;
  structure_mode: string | null;
  local_display_name: string;
  display_name: string;
  enabled: boolean;
}

export interface CambridgeNormalizedSubject {
  id: number;
  subject_id: number;
  external_subject_key: string;
  title: string;
  programme_code: string;
  structure_mode: string;
  learning_unit_count: number;
  assessment_unit_count: number;
}

export interface CambridgeNormalizedLearningUnit {
  id: number;
  external_unit_key: string;
  parent_id: number | null;
  unit_type: string;
  title: string;
  description: string;
  sort_order: number;
}

export interface CambridgeNormalizedAssessmentUnit {
  id: number;
  external_assessment_key: string;
  title: string;
  assessment_type: string;
  weight_percentage: string | null;
  max_mark: number | null;
}

export interface CambridgeSubjectProgress {
  normalized_subject_id: number;
  title: string;
  programme_code: string;
  structure_mode: string;
  total_units: number;
  covered_units: number;
  progress_percentage: number;
  status: string;
  computed_at: string | null;
}

export interface CambridgeMessageResponse {
  detail: string;
}

export interface CambridgeRenameSubjectPayload {
  local_display_name: string;
}

export interface CambridgeInspectionObjective {
  id: number;
  objective_code: string;
  stage_number: number;
  statement: string;
  sort_order: number;
}

export interface CambridgeInspectionSubstrand {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  objectives: CambridgeInspectionObjective[];
}

export interface CambridgeInspectionStrand {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  objectives: CambridgeInspectionObjective[];
  substrands: CambridgeInspectionSubstrand[];
}

export interface CambridgeInspectionFrameworkDetail {
  id: number;
  subject_profile_id: number;
  subject_code: string;
  subject_title: string;
  programme_code: string;
  structure_mode: string;
  version_label: string;
  effective_from: number;
  effective_to: number | null;
  is_current: boolean;
  strands: CambridgeInspectionStrand[];
}

export interface CambridgeInspectionAssessmentComponent {
  id: number;
  component_code: string;
  name: string;
  component_type: string;
  weight_percentage: string | null;
  max_mark: number | null;
  duration_minutes: number | null;
  is_optional: boolean;
}

export interface CambridgeInspectionEntryOption {
  id: number;
  option_code: string;
  zone_code: string;
  title: string;
  components: CambridgeInspectionAssessmentComponent[];
}

export interface CambridgeInspectionContentArea {
  id: number;
  code: string;
  title: string;
  sort_order: number;
  tier: string;
}

export interface CambridgeInspectionSyllabusDetail {
  id: number;
  subject_profile_id: number;
  subject_code: string;
  subject_title: string;
  programme_code: string;
  structure_mode: string;
  title: string;
  version_label: string;
  valid_from_year: number;
  valid_to_year: number | null;
  is_current: boolean;
  grading_scheme_type: string;
  has_core_extended: boolean;
  content_areas: CambridgeInspectionContentArea[];
  components: CambridgeInspectionAssessmentComponent[];
  entry_options: CambridgeInspectionEntryOption[];
}

// ============================================================================
// Catalogue authoring entities
// ============================================================================

export interface CambridgeCatalogueProgramme {
  id: number;
  code: string;
  title: string;
  structure_mode: string;
  display_stage_range: string;
  sort_order: number;
  active: boolean;
}

export interface CambridgeCatalogueProgrammeCreatePayload {
  code: string;
  title: string;
  structure_mode: string;
  display_stage_range: string;
  active?: boolean;
  sort_order?: number;
}

export interface CambridgeCatalogueSubjectProfile {
  id: number;
  title: string;
  programme: number;
  current_framework: number | null;
  current_syllabus: number | null;
  subject_code: string;
  active: boolean;
  sort_order: number;
  structure_mode: string;
}

export interface CambridgeCatalogueSubjectProfileCreatePayload {
  title: string;
  programme: number;
  active?: boolean;
  current_framework?: number | null;
  current_syllabus?: number | null;
  subject_code?: string;
  sort_order?: number;
}

export interface CambridgeCatalogueFramework {
  id: number;
  subject_profile: number;
  version_label: string;
  effective_from: number;
  effective_to: number | null;
  is_current: boolean;
}

export interface CambridgeCatalogueFrameworkCreatePayload {
  subject_profile: number;
  version_label: string;
  effective_from: number;
  effective_to?: number | null;
}

export interface CambridgeCatalogueStrand {
  id: number;
  framework: number;
  code: string;
  name: string;
  sort_order: number;
}

export interface CambridgeCatalogueStrandCreatePayload {
  framework: number;
  code: string;
  name: string;
  sort_order?: number;
}

export interface CambridgeCatalogueSubstrand {
  id: number;
  strand: number;
  code: string;
  name: string;
  sort_order: number;
}

export interface CambridgeCatalogueSubstrandCreatePayload {
  name: string;
}

export interface CambridgeCatalogueLearningObjective {
  id: number;
  strand: number;
  substrand: number;
  stage_number: number;
  objective_code: string;
  statement: string;
  sort_order: number;
  metadata_json: Record<string, unknown>;
}

export interface CambridgeCatalogueLearningObjectiveCreatePayload {
  stage_number: number;
  statement: string;
  metadata_json?: Record<string, unknown>;
}

export interface CambridgeCatalogueSyllabus {
  id: number;
  subject_profile: number;
  title: string;
  version_label: string;
  valid_from_year: number;
  valid_to_year: number | null;
  grading_scheme_type: string;
  has_core_extended: boolean;
  metadata_json: Record<string, unknown>;
  is_current: boolean;
}

export interface CambridgeCatalogueSyllabusCreatePayload {
  subject_profile: number;
  title: string;
  version_label: string;
  valid_from_year: number;
  valid_to_year?: number | null;
  grading_scheme_type?: string;
  has_core_extended?: boolean;
  metadata_json?: Record<string, unknown>;
}

export interface CambridgeCatalogueSyllabusContentArea {
  id: number;
  syllabus: number;
  code: string;
  title: string;
  sort_order: number;
  tier: string;
}

export interface CambridgeCatalogueSyllabusContentAreaCreatePayload {
  syllabus: number;
  code: string;
  title: string;
  tier: string;
  sort_order?: number;
}

export interface CambridgeCatalogueAssessmentComponent {
  id: number;
  syllabus: number;
  component_code: string;
  name: string;
  component_type: string;
  weight_percentage: string | null;
  max_mark: number | null;
  duration_minutes: number | null;
  is_optional: boolean;
  metadata_json: Record<string, unknown>;
}

export interface CambridgeCatalogueAssessmentComponentCreatePayload {
  syllabus: number;
  component_code: string;
  name: string;
  component_type: string;
  weight_percentage?: string | null;
  max_mark?: number | null;
  duration_minutes?: number | null;
  is_optional?: boolean;
  metadata_json?: Record<string, unknown>;
}

export interface CambridgeCatalogueEntryOption {
  id: number;
  syllabus: number;
  option_code: string;
  zone_code: string;
  title: string;
  metadata_json: Record<string, unknown>;
  components: CambridgeCatalogueAssessmentComponent[];
}

export interface CambridgeCatalogueEntryOptionPayload {
  syllabus: number;
  option_code: string;
  zone_code?: string;
  title: string;
  metadata_json?: Record<string, unknown>;
  component_ids?: number[];
}

export interface CambridgeCatalogueListFilter {
  programme?: number;
  subject_profile?: number;
  framework?: number;
  strand?: number;
  substrand?: number;
  syllabus?: number;
  active?: boolean;
}

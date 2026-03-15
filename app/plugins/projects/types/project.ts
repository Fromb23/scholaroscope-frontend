// Project Types
export enum EvaluationType {
  NUMERIC = 'NUMERIC',
  RUBRIC = 'RUBRIC',
  DESCRIPTIVE = 'DESCRIPTIVE'
}

// Project
export interface Project {
  id: number;
  subject: number;
  subject_name: string;
  subject_code: string;
  term: number | null;
  term_name: string | null;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  total_marks: number | null;
  evaluation_type: string;
  evaluation_type_display: string;
  rubric_scale: number | null;
  rubric_scale_name: string | null;
  sessions_count: number;
  participants_count: number;
  milestones_count: number;
  created_at: string;
  created_by: string;
}

export interface ProjectMilestone {
  id: number;
  project: number;
  name: string;
  description: string;
  sequence: number;
  due_date: string | null;
  max_score: number | null;
  scores_count: number;
}

export interface ProjectStatistics {
  total_participants: number;
  submitted: number;
  evaluated: number;
  pending_submission: number;
  pending_evaluation: number;
  average_score?: number;
  scored_count?: number;
}

export interface ProjectDetail extends Project {
  milestones: ProjectMilestone[];
  statistics: ProjectStatistics;
}

// Project Participation
export interface ProjectParticipation {
  id: number;
  project: number;
  project_name: string;
  student: number;
  student_name: string;
  student_admission: string;
  final_score: number | null;
  total_marks: number;
  percentage: number | null;
  rubric_level: number | null;
  rubric_level_label: string | null;
  comments: string;
  submitted_at: string | null;
  evaluated_at: string | null;
  evaluated_by: string;
}

export interface MilestoneScore {
  id: number;
  milestone: number;
  milestone_name: string;
  participation: number;
  student_name: string;
  student_admission: string;
  score: number | null;
  max_score: number;
  percentage: number | null;
  comments: string;
  evaluated_at: string;
  evaluated_by: string;
}

export interface ProjectParticipationDetail extends ProjectParticipation {
  milestone_scores: MilestoneScore[];
}

export interface ProjectProgressReport {
  student: {
    id: number;
    name: string;
    admission_number: string;
  };
  submitted: boolean;
  evaluated: boolean;
  final_score: number | null;
  milestone_progress: {
    milestone_name: string;
    completed: boolean;
    score: number | null;
    max_score: number;
  }[];
}

// Form Data Types
export interface ProjectFormData {
  subject: number;
  term: number | null;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  total_marks: number | null;
  evaluation_type: string;
  rubric_scale: number | null;
}

export interface MilestoneFormData {
  project: number;
  name: string;
  description: string;
  sequence: number;
  due_date: string | null;
  max_score: number | null;
}
import type { OrgType, WorkspaceMode } from '@/app/core/types/auth';

export type WorkspaceBadgeVariant = 'blue' | 'purple' | 'green' | 'orange' | 'indigo';

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  INSTITUTION: 'Institution',
  PERSONAL: 'Personal Workspace',
  INDEPENDENT_TEACHER: 'Independent Teacher Workspace',
  LEARNER_WORKSPACE: 'Learner Workspace',
  TUITION_CENTER: 'Tuition Center',
  HOMESCHOOL: 'Homeschool',
};

export const ORG_TYPE_BADGE_VARIANTS: Record<OrgType, WorkspaceBadgeVariant> = {
  INSTITUTION: 'blue',
  PERSONAL: 'purple',
  INDEPENDENT_TEACHER: 'green',
  LEARNER_WORKSPACE: 'orange',
  TUITION_CENTER: 'indigo',
  HOMESCHOOL: 'green',
};

export const WORKSPACE_MODE_COPY: Record<
  WorkspaceMode,
  {
    label: string;
    description: string;
    placeholder: string;
  }
> = {
  SCHOOL: {
    label: 'School / Institution',
    description:
      'Set up an institution workspace for administrators, instructors, learners, cohorts, and reports.',
    placeholder: 'e.g. Sunrise Academy',
  },
  INDEPENDENT_TEACHER: {
    label: 'Independent Teacher',
    description:
      'Set up a teacher-owned workspace. You manage your setup but teach as an instructor.',
    placeholder: 'e.g. Achieng Tutoring',
  },
  HOME_TUITION: {
    label: 'Home Tuition for one learner',
    description:
      'Set up a learner-owned workspace where guardians can invite tutors and preserve one learner\'s academic record.',
    placeholder: 'e.g. Jayden Learning Record',
  },
  TUITION_CENTER: {
    label: 'Private Tuition Center',
    description:
      'Set up a tuition center workspace for tutors, learners, groups, and reports.',
    placeholder: 'e.g. Horizon Tuition Centre',
  },
  HOMESCHOOL: {
    label: 'Homeschool',
    description: 'Set up a homeschool workspace for guardian-led learner tracking.',
    placeholder: 'e.g. Njeri Homeschool',
  },
  PERSONAL: {
    label: 'Personal Workspace',
    description: 'Private workspace for personal use only.',
    placeholder: 'e.g. Personal Study Space',
  },
};

export function getWorkspaceManagementLabel(orgType?: OrgType | null): string {
  switch (orgType) {
    case 'INSTITUTION':
      return 'Institution Management';
    case 'LEARNER_WORKSPACE':
      return 'Learner Workspace Management';
    case 'TUITION_CENTER':
      return 'Tuition Center Management';
    default:
      return 'Workspace Management';
  }
}

export function isSelfManagedWorkspace(orgType?: OrgType | null): boolean {
  return orgType === 'PERSONAL' || orgType === 'INDEPENDENT_TEACHER' || orgType === 'HOMESCHOOL';
}

export function isLearnerCenteredWorkspace(orgType?: OrgType | null): boolean {
  return orgType === 'LEARNER_WORKSPACE' || orgType === 'HOMESCHOOL';
}

export const ORG_TYPE_OPTIONS: Array<{ value: OrgType; label: string }> = [
  { value: 'INSTITUTION', label: ORG_TYPE_LABELS.INSTITUTION },
  { value: 'PERSONAL', label: ORG_TYPE_LABELS.PERSONAL },
  { value: 'INDEPENDENT_TEACHER', label: ORG_TYPE_LABELS.INDEPENDENT_TEACHER },
  { value: 'LEARNER_WORKSPACE', label: ORG_TYPE_LABELS.LEARNER_WORKSPACE },
  { value: 'TUITION_CENTER', label: ORG_TYPE_LABELS.TUITION_CENTER },
  { value: 'HOMESCHOOL', label: ORG_TYPE_LABELS.HOMESCHOOL },
];

import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Briefcase,
  Calendar,
  Database,
  FileBarChart,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';

export interface ReportHierarchyItem {
  key: string;
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
  group: 'primary' | 'secondary' | 'maintenance';
}

export interface ReportHierarchyStep {
  level: string;
  question: string;
}

const REPORT_HIERARCHY_ITEMS: ReportHierarchyItem[] = [
  {
    key: 'learners',
    name: 'Learners',
    href: '/reports/students',
    icon: Users,
    description: 'Start with one learner and follow subject, attendance, assessment, evidence, and CBC progress from that learner context.',
    group: 'primary',
  },
  {
    key: 'classes',
    name: 'Classes',
    href: '/reports/cohorts',
    icon: GraduationCap,
    description: 'Start with one class and move into class subjects, instructors, attendance gaps, sessions, and learner follow-up.',
    group: 'primary',
  },
  {
    key: 'subjects',
    name: 'Subjects',
    href: '/reports/subjects',
    icon: BookOpen,
    description: 'Start with one subject and compare class offerings, responsible instructors, delivery depth, and evidence coverage.',
    group: 'primary',
  },
  {
    key: 'instructors',
    name: 'Instructors',
    href: '/reports/instructors',
    icon: Briefcase,
    description: 'Start with one instructor and inspect teaching load, attendance capture, reflection discipline, and learner response.',
    group: 'primary',
  },
  {
    key: 'attendance',
    name: 'Scoped Attendance Explorer',
    href: '/reports/attendance',
    icon: Calendar,
    description: 'Attendance stays secondary to learner, class, subject, and class-subject investigations.',
    group: 'secondary',
  },
  {
    key: 'policies',
    name: 'Report Policies',
    href: '/reports/policies',
    icon: ShieldCheck,
    description: 'Review the policy surfaces that shape report meaning without turning them into a separate reporting world.',
    group: 'secondary',
  },
  {
    key: 'maintenance',
    name: 'Compute / Maintenance',
    href: '/reports/compute',
    icon: Database,
    description: 'Use compute and maintenance only after identifying the reporting surface that needs attention.',
    group: 'maintenance',
  },
];

export const REPORT_HIERARCHY_STEPS: ReportHierarchyStep[] = [
  {
    level: '1. Workspace overview',
    question: 'Where should I look first in this term and curriculum mix?',
  },
  {
    level: '2. Class or learner context',
    question: 'Which class or learner needs attention now?',
  },
  {
    level: '3. Subject or class-subject context',
    question: 'Is teaching, attendance, assessment, and evidence capture happening inside this learning area?',
  },
  {
    level: '4. Instructor and learner follow-up',
    question: 'Who is responsible, who is at risk, and what evidence supports the next action?',
  },
];

export function getAdminReportNavigationItems() {
  return [
    {
      name: 'Reports Overview',
      href: '/reports',
      icon: FileBarChart,
    },
    ...REPORT_HIERARCHY_ITEMS.map((item) => ({
      name: item.key === 'instructors' ? 'Instructor Reports' : item.name,
      href: item.href,
      icon: item.icon,
    })),
  ];
}

export function getAdminReportLandingSections() {
  return {
    primary: REPORT_HIERARCHY_ITEMS.filter((item) => item.group === 'primary'),
    secondary: REPORT_HIERARCHY_ITEMS.filter((item) => item.group === 'secondary'),
    maintenance: REPORT_HIERARCHY_ITEMS.filter((item) => item.group === 'maintenance'),
    compatibility: [
      {
        name: 'Assessment compatibility view',
        href: '/reports/assessments',
        description: 'Keep the flat assessment report for compatibility, but reach it after choosing the learner, class, subject, or instructor context.',
      },
    ],
  };
}

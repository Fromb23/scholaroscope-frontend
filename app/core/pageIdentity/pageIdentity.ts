export interface PageIdentityDescriptor {
  pageKind: string;
  displayLabel: string;
  parentSection?: string;
  fallbackLabel?: string;
}

export interface PageIdentityRoute {
  pattern: RegExp;
  descriptor: PageIdentityDescriptor;
}

const pluginRoutes: PageIdentityRoute[] = [];

export const ROOT_TITLE = 'Scholaroscope';
export const TITLE_TEMPLATE = '%s | Scholaroscope';

export function formatDocumentTitle(label?: string | null): string {
  const cleanLabel = (label ?? '').trim();
  if (!cleanLabel || cleanLabel === ROOT_TITLE) return ROOT_TITLE;
  if (cleanLabel.endsWith(`| ${ROOT_TITLE}`)) return cleanLabel;
  return `${cleanLabel} | ${ROOT_TITLE}`;
}

export function registerPageIdentityRoute(route: PageIdentityRoute): void {
  if (pluginRoutes.some((existing) => String(existing.pattern) === String(route.pattern))) {
    return;
  }
  pluginRoutes.push(route);
}

const staticRoutes: PageIdentityRoute[] = [
  { pattern: /^\/$/, descriptor: { pageKind: 'public.home', displayLabel: 'Scholaroscope' } },
  { pattern: /^\/login$/, descriptor: { pageKind: 'auth.login', displayLabel: 'Log in' } },
  { pattern: /^\/register$/, descriptor: { pageKind: 'auth.register', displayLabel: 'Create account' } },
  { pattern: /^\/forgot-password$/, descriptor: { pageKind: 'auth.forgot_password', displayLabel: 'Reset password' } },
  { pattern: /^\/dashboard\/instructor$/, descriptor: { pageKind: 'dashboard.instructor', displayLabel: 'Teaching Today' } },
  { pattern: /^\/dashboard\/admin$/, descriptor: { pageKind: 'dashboard.admin', displayLabel: 'Admin Dashboard' } },
  { pattern: /^\/dashboard$/, descriptor: { pageKind: 'dashboard', displayLabel: 'Dashboard' } },
  { pattern: /^\/assignments$/, descriptor: { pageKind: 'assignments.list', displayLabel: 'Assignments' } },
  { pattern: /^\/assessments$/, descriptor: { pageKind: 'assessments.list', displayLabel: 'Assessments' } },
  { pattern: /^\/assessments\/new$/, descriptor: { pageKind: 'assessments.new', displayLabel: 'New Assessment' } },
  { pattern: /^\/sessions$/, descriptor: { pageKind: 'sessions.list', displayLabel: 'Lessons' } },
  { pattern: /^\/sessions\/today$/, descriptor: { pageKind: 'sessions.today', displayLabel: 'Teaching Today' } },
  { pattern: /^\/lesson-plans$/, descriptor: { pageKind: 'lesson_plans.list', displayLabel: 'Lesson Plans' } },
  { pattern: /^\/lesson-plans\/generate$/, descriptor: { pageKind: 'lesson_plans.generate', displayLabel: 'Generate Lesson Plan' } },
  { pattern: /^\/academic$/, descriptor: { pageKind: 'academic.setup', displayLabel: 'Academic Setup' } },
  { pattern: /^\/academic\/cohorts$/, descriptor: { pageKind: 'cohorts.list', displayLabel: 'Classes' } },
  { pattern: /^\/academic\/terms$/, descriptor: { pageKind: 'terms.list', displayLabel: 'Terms' } },
  { pattern: /^\/academic\/years$/, descriptor: { pageKind: 'years.list', displayLabel: 'Academic Years' } },
  { pattern: /^\/academic\/subjects$/, descriptor: { pageKind: 'subjects.list', displayLabel: 'Subjects' } },
  { pattern: /^\/academic\/curricula$/, descriptor: { pageKind: 'curricula.list', displayLabel: 'Curricula' } },
  { pattern: /^\/learners$/, descriptor: { pageKind: 'learners.list', displayLabel: 'Learners' } },
  { pattern: /^\/learners\/new$/, descriptor: { pageKind: 'learners.new', displayLabel: 'New Learner' } },
  { pattern: /^\/reports$/, descriptor: { pageKind: 'reports.home', displayLabel: 'Reports' } },
  { pattern: /^\/reports\/students$/, descriptor: { pageKind: 'reports.students', displayLabel: 'Learner Reports' } },
  { pattern: /^\/reports\/cohorts$/, descriptor: { pageKind: 'reports.cohorts', displayLabel: 'Class Reports' } },
  { pattern: /^\/reports\/subjects$/, descriptor: { pageKind: 'reports.subjects', displayLabel: 'Subject Reports' } },
  { pattern: /^\/reports\/instructor\/cohort-subjects$/, descriptor: { pageKind: 'reports.my_subjects', displayLabel: 'My Class Subjects' } },
  { pattern: /^\/settings$/, descriptor: { pageKind: 'settings', displayLabel: 'Settings' } },
  { pattern: /^\/workspace-access\/roles$/, descriptor: { pageKind: 'workspace_access.roles', displayLabel: 'Workspace Roles' } },
  { pattern: /^\/revenue$/, descriptor: { pageKind: 'revenue', displayLabel: 'Revenue' } },
];

const dynamicFallbackRoutes: PageIdentityRoute[] = [
  { pattern: /^\/assessments\/[^/]+$/, descriptor: { pageKind: 'assessments.detail', displayLabel: 'Assessment' } },
  { pattern: /^\/academic\/cohorts\/[^/]+$/, descriptor: { pageKind: 'cohorts.detail', displayLabel: 'Class' } },
  { pattern: /^\/academic\/cohorts\/[^/]+\/assignments\/[^/]+$/, descriptor: { pageKind: 'assignments.detail', displayLabel: 'Assignment' } },
  { pattern: /^\/learners\/[^/]+$/, descriptor: { pageKind: 'learners.detail', displayLabel: 'Learner' } },
  { pattern: /^\/learners\/[^/]+\/portfolio$/, descriptor: { pageKind: 'learners.portfolio', displayLabel: 'Learner Portfolio' } },
  { pattern: /^\/sessions\/[^/]+$/, descriptor: { pageKind: 'sessions.detail', displayLabel: 'Lesson' } },
  { pattern: /^\/lesson-plans\/[^/]+$/, descriptor: { pageKind: 'lesson_plans.detail', displayLabel: 'Lesson Plan' } },
];

export function resolvePageIdentity(pathname: string): PageIdentityDescriptor {
  const routes = [...pluginRoutes, ...staticRoutes, ...dynamicFallbackRoutes];
  return routes.find((route) => route.pattern.test(pathname))?.descriptor
    ?? { pageKind: 'unknown', displayLabel: ROOT_TITLE };
}

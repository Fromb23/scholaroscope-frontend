import type { ReportProjection } from './reportIntent';

export interface ReportRouteRegistration {
  pattern: RegExp;
  object: string;
  projection: ReportProjection | 'query';
  treatment: 'canonical' | 'compatibility';
}

export const REPORT_ROUTE_REGISTRY: readonly ReportRouteRegistration[] = [
  { pattern: /^\/reports(?:\/workspace)?$/, object: 'workspace', projection: 'overview', treatment: 'canonical' },
  { pattern: /^\/reports\/cohorts\/\d+$/, object: 'cohort', projection: 'query', treatment: 'canonical' },
  { pattern: /^\/reports\/subjects\/\d+$/, object: 'workspace-subject', projection: 'query', treatment: 'canonical' },
  { pattern: /^\/reports\/cohort-subjects\/\d+$/, object: 'cohort-subject', projection: 'query', treatment: 'canonical' },
  { pattern: /^\/reports\/instructors\/\d+$/, object: 'instructor', projection: 'query', treatment: 'canonical' },
  { pattern: /^\/reports\/learners\/\d+\/overview$/, object: 'learner', projection: 'overview', treatment: 'canonical' },
  { pattern: /^\/reports\/learners\/\d+\/cohort-subjects\/\d+$/, object: 'learner-subject', projection: 'query', treatment: 'canonical' },
  { pattern: /^\/reports\/learners\/\d+\/portfolio$/, object: 'learner-portfolio', projection: 'portfolio', treatment: 'canonical' },
  { pattern: /^\/reports\/students(?:\/\d+)?$/, object: 'learner', projection: 'overview', treatment: 'compatibility' },
  { pattern: /^\/reports\/learners\/\d+\/subject$/, object: 'learner-subject', projection: 'overview', treatment: 'compatibility' },
  { pattern: /^\/reports\/learners\/\d+\/assessments$/, object: 'learner-subject', projection: 'assessments-results', treatment: 'compatibility' },
  { pattern: /^\/reports\/learners\/\d+\/assignments$/, object: 'learner-subject', projection: 'assignments', treatment: 'compatibility' },
  { pattern: /^\/reports\/instructor\/cohort-subjects\/\d+$/, object: 'cohort-subject', projection: 'query', treatment: 'compatibility' },
  { pattern: /^\/reports\/instructor\/cohort-subjects\/\d+\/class-report$/, object: 'cohort-subject', projection: 'overview', treatment: 'compatibility' },
  { pattern: /^\/reports\/attendance$/, object: 'scoped-intent', projection: 'attendance', treatment: 'compatibility' },
  { pattern: /^\/reports\/assessments$/, object: 'scoped-intent', projection: 'assessments-results', treatment: 'compatibility' },
];

export function resolveRegisteredReportRoute(pathname: string): ReportRouteRegistration | null {
  return REPORT_ROUTE_REGISTRY.find((entry) => entry.pattern.test(pathname)) ?? null;
}


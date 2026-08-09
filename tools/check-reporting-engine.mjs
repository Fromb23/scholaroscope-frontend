#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

const required = [
  'docs/REPORTING_ENGINE_LAW.md',
  'docs/reporting-engine-route-map.md',
  'app/core/components/reports/reportIntent.ts',
  'app/core/components/reports/reportRouteRegistry.ts',
  'app/(dashboard)/reports/cohort-subjects/[id]/page.tsx',
  'app/(dashboard)/reports/learners/[learnerId]/cohort-subjects/[cohortSubjectId]/page.tsx',
  'app/(dashboard)/reports/learners/[learnerId]/portfolio/page.tsx',
];
for (const file of required) {
  if (!existsSync(path.join(root, file))) failures.push(`${file}: required reporting-engine artifact is missing.`);
}

const law = read('docs/REPORTING_ENGINE_LAW.md');
for (let number = 1; number <= 18; number += 1) {
  if (!new RegExp(`^${number}\\. `, 'm').test(law)) failures.push(`docs/REPORTING_ENGINE_LAW.md: law ${number} is missing.`);
}

const canonicalPage = read('app/core/components/reports/InstructorCohortSubjectReportPage.tsx');
for (const projection of ['Overview', 'Learners', 'Attendance', 'Assessments & Results', 'Assignments', 'Curriculum Progress']) {
  if (!canonicalPage.includes(`label: '${projection}'`)) failures.push(`canonical cohort-subject page is missing ${projection}.`);
}
if (!canonicalPage.includes("parseReportIntent") || !canonicalPage.includes("router.push")) {
  failures.push('canonical cohort-subject navigation must use the report-intent contract and push meaningful navigation.');
}
if (/\.reduce\s*\(|\/\s*100|\*\s*100/.test(canonicalPage)) {
  failures.push('canonical cohort-subject presentation must not introduce client-owned derived metric calculations.');
}

const api = read('app/core/api/reporting.ts');
for (const suffix of ['overview/', 'learners/', 'performance/', 'teaching-activity/']) {
  if (!api.includes(`/reporting/cohort-subjects/\${cohortSubjectId}/${suffix}`)) {
    failures.push(`neutral cohort-subject API facade is missing ${suffix}.`);
  }
}
if (/authorityMode\s*[:=][^\n]*\?\?\s*['"]teaching['"]|authorityMode\s*=\s*['"]teaching['"]/.test(api)) {
  failures.push('dual-context reporting facades must not silently default authority mode to teaching.');
}
if (!api.includes('authority_mode: authorityMode') || !api.includes('authority_mode: params.authorityMode')) {
  failures.push('reporting facades must explicitly serialize their caller-provided authority mode.');
}

const client = read('app/core/api/client.ts');
if (client.includes('reportingAuthorityMode') || client.includes('scholaroscope_operating_context')) {
  failures.push('the shared API client must not guess reporting authority from browser storage.');
}

const authContext = read('app/context/AuthContext.tsx');
if (!authContext.includes('capabilities.authorization?.operating_contexts')) {
  failures.push('AuthContext must consume the backend-issued operating-context capability.');
}
if (/role\.(?:name|slug)|membership\.role/.test(authContext)) {
  failures.push('AuthContext must not reconstruct operating contexts from legacy roles or role names.');
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (['node_modules', '.next', '.git'].includes(name)) return [];
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}
for (const file of walk(path.join(root, 'app'))) {
  if (!/\.(ts|tsx)$/.test(file) || file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
  const source = readFileSync(file, 'utf8');
  if (source.includes('REPORT_HIERARCHY_ITEMS') && !file.endsWith(path.join('reports', 'reportHierarchy.ts'))) {
    failures.push(`${path.relative(root, file)}: parallel report catalogue detected.`);
  }
}

if (failures.length) {
  console.error('Reporting engine check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Reporting engine check passed.');

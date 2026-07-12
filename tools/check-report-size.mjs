#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const maxLines = 700;
const allowedGrowth = 15;

// Existing client-heavy report debt. Keep this list explicit so large files
// cannot grow quietly while report internals are split into smaller sections.
const baseline = {
  'app/plugins/cbc/components/reportPolicies/CbcReportPolicyFormModal.tsx': {
    lines: 1222,
    reason: 'Existing CBC policy authoring modal remains client-heavy pending a dedicated form split.',
  },
  'app/core/components/reports/ClassSubjectReportPage.tsx': {
    lines: 935,
    reason: 'Existing class subject report client island with filters, exports, and report policy state.',
  },
  'app/core/components/reports/ComputePage.tsx': {
    lines: 725,
    reason: 'Existing final report computation client island with readiness, reconciliation, progress, and repair controls.',
  },
  'app/core/components/reports/InstructorCohortSubjectReportPage.tsx': {
    lines: 760,
    reason: 'Existing instructor class-subject report client island.',
  },
  'app/core/components/reports/TeacherPerformanceReportPage.tsx': {
    lines: 749,
    reason: 'Existing teacher performance report client island with export and summary sections.',
  },
  'app/core/components/reports/LearnerSubjectReportPage.tsx': {
    lines: 819,
    reason: 'Existing learner subject detail report remains client-heavy; this phase removed client-side exports while leaving deeper presentation splits deferred.',
  },
};

const roots = [
  'app/core/components/reports',
  'app/plugins/cbc/components/reportPolicies',
  'app/plugins/cbc/components/reportPolicies/routes',
];

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      entries.push(...walk(file));
    } else if (/\.tsx$/.test(name)) {
      entries.push(file);
    }
  }
  return entries;
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function lineCount(file) {
  return readFileSync(file, 'utf8').split(/\r?\n/).length;
}

for (const relativeRoot of roots) {
  for (const file of walk(path.join(root, relativeRoot))) {
    const relativePath = rel(file);
    const lines = lineCount(file);
    const entry = baseline[relativePath];

    if (lines > maxLines && !entry) {
      failures.push(`${relativePath} has ${lines} lines and is not in the report-size baseline.`);
      continue;
    }

    if (entry && lines > entry.lines + allowedGrowth) {
      failures.push(`${relativePath} grew from baseline ${entry.lines} to ${lines} lines. Extract a presentation section or update the baseline with a documented reason.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Report size check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Report size check passed.');

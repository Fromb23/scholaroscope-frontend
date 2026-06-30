#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appRoot = path.join(root, 'app');
const failures = [];

const LOCAL_TOAST_STATE_BASELINE = new Set([
  'app/core/components/academic/subjects/SubjectsPage.tsx',
]);

const AUTO_DISMISS_BASELINE = {
  'app/core/components/academic/cohorts/AdminCohortsPageContent.tsx': 1,
  'app/core/components/academic/subjects/SubjectsPage.tsx': 1,
  'app/core/components/assessments/CreateAssessmentPage.tsx': 1,
  'app/core/components/assessments/EditAssessmentPage.tsx': 1,
  'app/core/components/curricula/CurriculumFormModal.tsx': 1,
  'app/core/components/lessonPlans/LessonPlanDetailPage.tsx': 7,
  'app/core/components/lessonPlans/LessonPlansPage.tsx': 2,
  'app/core/components/sessions/RescheduleLessonModal.tsx': 1,
  'app/core/components/sessions/SessionDetailPage.tsx': 1,
  'app/core/components/sessions/SessionForm.tsx': 1,
  'app/core/components/settings/SettingsComponents.tsx': 1,
  'app/plugins/announcements/components/AnnouncementsPage.tsx': 1,
  'app/plugins/cbc/components/teaching/CBCEvidenceEntryPage.tsx': 1,
  'app/plugins/schemes/components/SchemeDetailPage.tsx': 1,
};

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      entries.push(...walk(file));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) {
      entries.push(file);
    }
  }
  return entries;
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

for (const file of walk(appRoot)) {
  const relativePath = rel(file);
  if (/\.test\.(ts|tsx)$/.test(relativePath)) continue;
  const source = readFileSync(file, 'utf8');

  if (/useState\s*<\s*string\s*\|\s*null\s*>\s*\(\s*null\s*\)/.test(source) && /\btoastMessage\b/.test(source)) {
    if (!LOCAL_TOAST_STATE_BASELINE.has(relativePath)) {
      failures.push(`${relativePath} uses local toastMessage state; route non-blocking messages through ToastProvider/useToast.`);
    }
  }

  if (
    relativePath !== 'app/components/ui/ErrorBanner.tsx'
    && !relativePath.startsWith('app/components/ui/toast/')
  ) {
    const autoDismissCount = count(source, /\bautoDismissMs\s*=/g);
    const allowedCount = AUTO_DISMISS_BASELINE[relativePath] ?? 0;
    if (autoDismissCount > allowedCount) {
      failures.push(`${relativePath} adds ad hoc auto-dismiss message UI; use ToastProvider/useToast for toast channel messages.`);
    }
  }
}

const thinWrapperChecks = [
  {
    path: 'app/components/ui/errors/NetworkErrorState.tsx',
    pattern: /return\s*<ErrorState\s+error=\{error\}\s+onRetry=\{onRetry\}\s+className=\{className\}\s*\/>\s*;/,
  },
  {
    path: 'app/components/ui/errors/PermissionErrorState.tsx',
    pattern: /return\s*<ErrorState\s+error=\{error\}\s+onRetry=\{onRetry\}\s+className=\{className\}\s*\/>\s*;/,
  },
];

for (const check of thinWrapperChecks) {
  const source = readFileSync(path.join(root, check.path), 'utf8');
  if (check.pattern.test(source)) {
    failures.push(`${check.path} is a pass-through ErrorState wrapper without channel-specific behavior.`);
  }
}

if (failures.length > 0) {
  console.error('Error channel check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Error channel check passed.');

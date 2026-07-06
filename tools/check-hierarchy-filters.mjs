#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const filterFiles = [
  'app/core/components/reports/LearnerAssessmentReportPage.tsx',
  'app/core/components/lessonPlans/LessonPlansPage.tsx',
  'app/plugins/schemes/components/SchemesPage.tsx',
  'app/core/components/reports/CohortsReportPage.tsx',
  'app/core/components/reports/StudentsReportPage.tsx',
  'app/core/components/reports/AttendanceReportFilters.tsx',
];

// Known hierarchy-filter ordering debt. Keep reasons explicit so new files
// cannot add child-before-parent filters without being noticed.
const baseline = {
  'app/core/components/lessonPlans/LessonPlansPage.tsx': {
    reason: 'Subject ordered before cohort; correcting requires grouping-mode rework. Hierarchy debt.',
  },
  'app/plugins/schemes/components/SchemesPage.tsx': {
    reason: 'Mirrors lesson plan ordering; fix alongside lesson plans.',
  },
};

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function extractSelectLabels(source) {
  const labels = [];
  const pattern = /<Select\b(?:(?!<Select\b)[\s\S])*?label="([^"]+)"/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    labels.push({
      label: match[1],
      line: lineNumber(source, match.index),
    });
  }

  return labels;
}

function normalizeLabel(label) {
  return label
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hierarchyLevel(label) {
  const normalized = normalizeLabel(label);

  if (normalized === 'academic year' || normalized === 'year') return 1;
  if (normalized === 'term') return 2;
  if (
    normalized === 'subject'
    || normalized === 'subject scope'
    || normalized === 'class subject'
  ) {
    return 4;
  }
  if (normalized === 'cohort' || normalized === 'class') return 3;
  if (normalized === 'instructor') return 5;

  return null;
}

function formatSequence(items) {
  return items.map((item) => `${item.label}(${item.level})`).join(' -> ');
}

for (const relativePath of filterFiles) {
  const source = read(relativePath);
  const hierarchyItems = extractSelectLabels(source)
    .map((item) => ({
      ...item,
      level: hierarchyLevel(item.label),
    }))
    .filter((item) => item.level != null);

  let violation = null;
  for (let index = 1; index < hierarchyItems.length; index += 1) {
    const previous = hierarchyItems[index - 1];
    const current = hierarchyItems[index];

    if (current.level < previous.level) {
      violation = {
        line: current.line,
        message: `${relativePath}:${current.line} hierarchy filter order is ${formatSequence(hierarchyItems)}.`,
      };
      break;
    }
  }

  const baselineEntry = baseline[relativePath];
  if (violation && !baselineEntry) {
    failures.push(violation.message);
  } else if (!violation && baselineEntry) {
    warnings.push(`${relativePath} is in the hierarchy-filter baseline but now passes. Remove the baseline entry. Reason was: ${baselineEntry.reason}`);
  }
}

if (warnings.length > 0) {
  console.warn('Hierarchy filter check warnings:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error('Hierarchy filter check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Hierarchy filter check passed.');

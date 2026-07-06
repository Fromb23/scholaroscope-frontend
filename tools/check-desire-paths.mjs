#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const roots = [
  'app/core/components',
  'app/plugins',
];

// Existing profile-link debt. Keep exact counts so known gaps cannot expand
// while desire paths are rolled through older management surfaces.
const baseline = {
  'app/core/components/academic/cohorts/CohortStudentsPage.tsx': {
    count: 1,
    reason: 'Class learner profile helper carries an implicit class return path; migrate to explicit returnTo when learner profile navigation is consolidated.',
  },
  'app/core/components/academic/cohortSubjects/CohortSubjectLearnersPage.tsx': {
    count: 1,
    reason: 'Admin enrolment-management branch still uses subject-anchor profile navigation; instructor report desire path is handled separately.',
  },
};

const helperNamePattern = /\bbuild(?:Learner|ClassLearner|ClassSubjectLearner|Instructor)[A-Za-z]*(?:Report|Profile)Href\b/g;

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      entries.push(...walk(file));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      entries.push(file);
    }
  }
  return entries;
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function importedHelperNames(source) {
  const names = new Set();
  const importPattern = /import[\s\S]*?from\s+['"][^'"]+['"];?/g;
  let match;

  while ((match = importPattern.exec(source)) !== null) {
    const importText = match[0];
    for (const helperMatch of importText.matchAll(helperNamePattern)) {
      names.add(helperMatch[0]);
    }
  }

  return names;
}

function extractCallArgs(source, openParenIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openParenIndex; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openParenIndex + 1, index);
      }
    }
  }

  return '';
}

function urlSearchParamsHasReturnTo(source, args) {
  const identifiers = Array.from(args.matchAll(/\b([A-Za-z_$][\w$]*)\b/g), (match) => match[1]);

  return identifiers.some((identifier) => {
    const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${escaped}\\.set\\(\\s*['"]returnTo['"]`).test(source);
  });
}

function callHasReturnTo(source, args) {
  return /\breturnTo\b/.test(args) || urlSearchParamsHasReturnTo(source, args);
}

function findViolations(relativePath, source) {
  const importedNames = importedHelperNames(source);
  if (importedNames.size === 0) {
    return [];
  }

  const violations = [];
  for (const helperName of importedNames) {
    const callPattern = new RegExp(`\\b${helperName}\\s*\\(`, 'g');
    let match;

    while ((match = callPattern.exec(source)) !== null) {
      const openParenIndex = match.index + match[0].lastIndexOf('(');
      const args = extractCallArgs(source, openParenIndex);

      if (!callHasReturnTo(source, args)) {
        violations.push({
          helperName,
          line: lineNumber(source, match.index),
          message: `${relativePath}:${lineNumber(source, match.index)} ${helperName} must carry returnTo state.`,
        });
      }
    }
  }

  return violations;
}

const files = roots.flatMap((relativeRoot) => walk(path.join(root, relativeRoot)));
const seenBaselineFiles = new Set();

for (const file of files) {
  const relativePath = rel(file);
  const source = readFileSync(file, 'utf8');
  const violations = findViolations(relativePath, source);
  const baselineEntry = baseline[relativePath];

  if (baselineEntry) {
    seenBaselineFiles.add(relativePath);
    if (violations.length > baselineEntry.count) {
      failures.push(`${relativePath} has ${violations.length} desire-path returnTo violations, above baseline ${baselineEntry.count}. ${baselineEntry.reason}`);
    } else if (violations.length < baselineEntry.count) {
      warnings.push(`${relativePath} is below desire-path baseline (${violations.length}/${baselineEntry.count}). Remove or reduce the baseline. Reason was: ${baselineEntry.reason}`);
    }
    continue;
  }

  failures.push(...violations.map((violation) => violation.message));
}

Object.keys(baseline).forEach((relativePath) => {
  if (!seenBaselineFiles.has(relativePath)) {
    warnings.push(`${relativePath} is in the desire-path baseline but was not scanned. Remove the stale baseline entry.`);
  }
});

if (warnings.length > 0) {
  console.warn('Desire path check warnings:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error('Desire path check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Desire path check passed.');

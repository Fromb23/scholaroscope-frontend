#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const VALID_PRIORITIES = new Set(['P0', 'P1', 'P2']);
const DEFAULT_BASELINE_PATH = path.join(cwd, 'tools/form-validation-baseline.json');

const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const scanRoot = path.resolve(readArg('--root', path.join(cwd, 'app')));
const baselinePath = path.resolve(readArg('--baseline', DEFAULT_BASELINE_PATH));
const printBaseline = args.includes('--print-baseline');

const RULES = [
  {
    id: 'silent-validate-return',
    test: (source) => countMatches(source, /if\s*\(\s*!\s*validate\s*\([^)]*\)\s*\)\s*return(?:\s+[^;]+)?;/g),
  },
  {
    id: 'silent-is-valid-return',
    test: (source) => countMatches(source, /if\s*\(\s*!\s*isValid\s*\)\s*return(?:\s+[^;]+)?;/g),
  },
  {
    id: 'object-errors-return',
    test: (source) => countMatches(source, /if\s*\(\s*Object\.keys\([^)]*errors[^)]*\)\.length\s*\)\s*return(?:\s+[^;]+)?;/g),
  },
  {
    id: 'validator-boolean-return',
    test: (source) => countMatches(
      source,
      /set[A-Za-z]*Errors\s*\([^;]+;\s*return\s+Object\.keys\([^)]*errors?[^)]*\)\.length\s*={2,3}\s*0\s*;/gs,
    ),
  },
  {
    id: 'console-only-validation-catch',
    test: (source) => {
      const catchBlocks = source.match(/catch\s*\([^)]*\)\s*\{[\s\S]*?\}/g) ?? [];
      return catchBlocks.filter((block) => (
        /console\.(error|warn)\s*\(/.test(block)
        && !/set[A-Za-z]*(Error|Errors|FieldErrors|ApiError)\s*\(/.test(block)
      )).length;
    },
  },
  {
    id: 'required-form-without-summary',
    test: (source) => {
      if (!/(<form\b|onSubmit=|handleSubmit|const\s+submit\s*=|async\s+submit)/.test(source)) return 0;
      if (/(FormValidationSummary|useFormValidationFeedback|ValidationErrorSummary|AppErrorBanner|createFormValidationAppError)/.test(source)) return 0;

      const requiredControls = countMatches(source, /<(Input|Select|input|select|textarea)\b[^>]*\brequired\b/g);
      if (requiredControls > 1) return 1;
      if (requiredControls === 1 && !/form-validation-check:\s*allow-one-field-inline/.test(source)) return 1;
      return 0;
    },
  },
];

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function walk(dir) {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'coverage', 'dist', 'build'].includes(entry)) return [];
      return walk(fullPath);
    }
    return [fullPath];
  });
}

function shouldScan(file) {
  if (!/\.(tsx?|jsx?)$/.test(file)) return false;
  if (/\.d\.ts$/.test(file)) return false;
  if (/\.(test|spec)\.(tsx?|jsx?)$/.test(file)) return false;
  return true;
}

function collectFindings() {
  const files = existsSync(scanRoot) ? walk(scanRoot).filter(shouldScan) : [];
  const findings = new Map();

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const relative = toPosix(path.relative(scanRoot, file));

    for (const rule of RULES) {
      const count = rule.test(source);
      if (count > 0) {
        findings.set(`${relative}::${rule.id}`, count);
      }
    }
  }

  return findings;
}

function readBaseline() {
  if (!existsSync(baselinePath)) return {};
  return JSON.parse(readFileSync(baselinePath, 'utf8'));
}

function validateBaselineEntry(key, entry) {
  const errors = [];
  if (!entry || typeof entry !== 'object') {
    return [`${key} must be an object with count, reason, owner, priority, and removeBy.`];
  }
  if (!Number.isInteger(entry.count) || entry.count < 0) errors.push(`${key} has invalid count.`);
  if (typeof entry.reason !== 'string' || entry.reason.trim().length === 0) errors.push(`${key} is missing reason.`);
  if (typeof entry.owner !== 'string' || entry.owner.trim().length === 0) errors.push(`${key} is missing owner.`);
  if (!VALID_PRIORITIES.has(entry.priority)) errors.push(`${key} has invalid priority.`);
  if (typeof entry.removeBy !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.removeBy)) {
    errors.push(`${key} has invalid removeBy.`);
  }
  return errors;
}

function suggestedBaseline(findings) {
  return Object.fromEntries(
    [...findings.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => [
      key,
      {
        count,
        reason: 'Existing form-validation migration debt. Do not add new silent validation paths.',
        owner: 'frontend-migration',
        priority: key.includes('auth/') || key.includes('sessions/') || key.includes('learners/') || key.includes('reports/')
          ? 'P0'
          : 'P1',
        removeBy: key.includes('auth/') || key.includes('sessions/') || key.includes('learners/') || key.includes('reports/')
          ? '2026-08-31'
          : '2026-10-31',
      },
    ]),
  );
}

const findings = collectFindings();

if (printBaseline) {
  process.stdout.write(`${JSON.stringify(suggestedBaseline(findings), null, 2)}\n`);
  process.exit(0);
}

const baseline = readBaseline();
const failures = [];

for (const [key, entry] of Object.entries(baseline)) {
  failures.push(...validateBaselineEntry(key, entry));
}

for (const [key, count] of findings.entries()) {
  const baselineEntry = baseline[key];
  if (!baselineEntry) {
    failures.push(`${key} has ${count} finding(s) and is not in the form-validation baseline.`);
    continue;
  }
  if (count > baselineEntry.count) {
    failures.push(`${key} increased from baseline ${baselineEntry.count} to ${count}.`);
  }
}

if (failures.length > 0) {
  console.error('Form validation guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const activeBaseline = Object.entries(baseline)
  .filter(([key, entry]) => (findings.get(key) ?? 0) > 0 && entry.count > 0)
  .length;

console.log(`Form validation guard passed. Active baseline entries: ${activeBaseline}.`);

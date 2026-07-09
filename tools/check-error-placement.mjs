#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const VALID_PRIORITIES = new Set(['P0', 'P1', 'P2']);
const DEFAULT_BASELINE_PATH = path.join(cwd, 'tools/error-placement-baseline.json');
const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const scanRoot = path.resolve(readArg('--root', path.join(cwd, 'app')));
const baselinePath = path.resolve(readArg('--baseline', DEFAULT_BASELINE_PATH));
const printBaseline = args.includes('--print-baseline');
const SUSPECT_ERROR_STATE_NAMES = [
  'activeErrorMessage',
  'formError',
  'apiError',
  'submitError',
  'submittingError',
  'pageError',
];

function readRepoFile(relativePath) {
  return readFileSync(path.join(cwd, relativePath), 'utf8');
}

function assertContains(relativePath, source, pattern, message, failures) {
  if (!pattern.test(source)) failures.push(`${relativePath}: ${message}`);
}

function assertNotContains(relativePath, source, pattern, message, failures) {
  if (pattern.test(source)) failures.push(`${relativePath}: ${message}`);
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function relativeToScanRoot(filePath) {
  return toPosix(path.relative(scanRoot, filePath));
}

function walk(dir) {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'coverage', 'dist', 'build', '.git'].includes(entry)) return [];
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

function errorBannerBlocks(source) {
  return [...source.matchAll(/<(?:AppErrorBanner|ErrorBanner)\b[\s\S]*?(?:\/>|<\/(?:AppErrorBanner|ErrorBanner)>)/g)]
    .map((match) => match[0]);
}

function countBannerStateDuplicates(source) {
  const blocks = errorBannerBlocks(source);
  const counts = new Map();
  for (const block of blocks) {
    for (const stateName of SUSPECT_ERROR_STATE_NAMES) {
      const messagePattern = new RegExp(`\\b(?:message|error)=\\{${stateName}\\b`);
      const childPattern = new RegExp(`\\{${stateName}\\}`);
      if (messagePattern.test(block) || childPattern.test(block)) {
        counts.set(stateName, (counts.get(stateName) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([stateName, count]) => [stateName, count]);
}

function collectFindings() {
  const files = existsSync(scanRoot) ? walk(scanRoot).filter(shouldScan) : [];
  const findings = new Map();

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const relative = relativeToScanRoot(file);
    for (const [stateName, count] of countBannerStateDuplicates(source)) {
      findings.set(`${relative}::duplicate-error-banner:${stateName}`, count);
    }
  }

  return findings;
}

function readBaseline() {
  if (!existsSync(baselinePath)) return {};
  return JSON.parse(readFileSync(baselinePath, 'utf8'));
}

function validateBaselineEntry(key, entry, today) {
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
  } else if (new Date(`${entry.removeBy}T23:59:59Z`) < today) {
    errors.push(`${key} baseline expired on ${entry.removeBy}.`);
  }
  return errors;
}

function priorityFor(key) {
  if (/dashboard|profile|settings|learners|cohorts|lessonPlans|sessions|reports|\(dashboard\)\/layout/.test(key)) {
    return 'P0';
  }
  if (/assessments|assignments|schemes|cbc|cambridge/i.test(key)) {
    return 'P1';
  }
  return 'P2';
}

function removeByFor(priority) {
  if (priority === 'P0') return '2026-08-31';
  if (priority === 'P1') return '2026-10-31';
  return '2026-12-31';
}

function suggestedBaseline(findings) {
  return Object.fromEntries(
    [...findings.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => {
      const priority = priorityFor(key);
      return [
        key,
        {
          count,
          reason: 'Existing duplicate error-placement migration debt. Do not render the same blocking app/form error in multiple banners.',
          owner: 'frontend-migration',
          priority,
          removeBy: removeByFor(priority),
        },
      ];
    }),
  );
}

const findings = collectFindings();

if (printBaseline) {
  process.stdout.write(`${JSON.stringify(suggestedBaseline(findings), null, 2)}\n`);
  process.exit(0);
}

const baseline = readBaseline();
const failures = [];
const suggestions = [];
const today = new Date();

const modalPath = 'app/components/ui/Modal.tsx';
const modalSource = readRepoFile(modalPath);
assertContains(
  modalPath,
  modalSource,
  /<ResponsiveActionSheet[\s\S]*closeDisabled=\{closeDisabled\}/,
  'shared Modal must delegate to ResponsiveActionSheet and preserve closeDisabled for active saves.',
  failures,
);

const actionStateBannerPath = 'app/components/ui/actions/ActionStateBanner.tsx';
const actionStateBannerSource = readRepoFile(actionStateBannerPath);
assertContains(
  actionStateBannerPath,
  actionStateBannerSource,
  /persist = true/,
  'ActionStateBanner must default foreground action messages to persistent display.',
  failures,
);
assertNotContains(
  actionStateBannerPath,
  actionStateBannerSource,
  /autoDismissMs|setTimeout\(/,
  'ActionStateBanner must not auto-dismiss blocking foreground action state.',
  failures,
);

const computePagePath = 'app/core/components/reports/ComputePage.tsx';
const computePageSource = readRepoFile(computePagePath);
assertContains(
  computePagePath,
  computePageSource,
  /<ComputeReportsSheet[\s\S]*status=\{computeActionStatus\}/,
  'Compute Reports must render foreground job state inside ComputeReportsSheet.',
  failures,
);
assertContains(
  computePagePath,
  computePageSource,
  /<ActionProgress[\s\S]*progressPercent=\{progressPercent\}/,
  'Compute progress must render inside the foreground sheet with ActionProgress.',
  failures,
);
assertContains(
  computePagePath,
  computePageSource,
  /<ReportPrepareTermSheet[\s\S]*autoPrepareKey=\{prepareAutoRunKey\}/,
  'Prepare Term must render foreground setup state inside ReportPrepareTermSheet.',
  failures,
);

const computeHookPath = 'app/core/hooks/reports/useComputePage.ts';
const computeHookSource = readRepoFile(computeHookPath);
assertContains(
  computeHookPath,
  computeHookSource,
  /setComputeActionError\(/,
  'Active compute failures must be stored in compute action state.',
  failures,
);
assertNotContains(
  computeHookPath,
  computeHookSource,
  /setGlobalError\(\s*resolved\.serverCode === 'report_compute_blocked'/,
  'Active compute failures must not be routed to the page-level globalError banner.',
  failures,
);

const assessmentCreatePath = 'app/core/components/assessments/CreateAssessmentPage.tsx';
const assessmentCreateSource = readRepoFile(assessmentCreatePath);
assertContains(
  assessmentCreatePath,
  assessmentCreateSource,
  /saveError \? \(\s*<ActionStateBanner[\s\S]*variant="error"/,
  'Assessment create saveError must render as a persistent foreground ActionStateBanner.',
  failures,
);
assertContains(
  assessmentCreatePath,
  assessmentCreateSource,
  /ALL_COMPONENTS_CREATED_MESSAGE/,
  'Assessment create must show the full all-components-created foreground reason.',
  failures,
);
assertNotContains(
  assessmentCreatePath,
  assessmentCreateSource,
  /autoDismissMs=\{?5000\}?/,
  'Assessment create critical save errors must not auto-dismiss.',
  failures,
);
assertContains(
  assessmentCreatePath,
  assessmentCreateSource,
  /submitDisabledReason \? \(\s*<ActionStateBanner/,
  'Assessment create submitDisabledReason must be visible near the submit action.',
  failures,
);

const assignmentModalPath = 'app/core/components/assignments/AssignmentCreateModal.tsx';
const assignmentModalSource = readRepoFile(assignmentModalPath);
assertContains(
  assignmentModalPath,
  assignmentModalSource,
  /<Modal[\s\S]*closeDisabled=\{saving\}[\s\S]*footer=\{/,
  'AssignmentCreateModal must use the responsive modal sheet with close protection and sticky footer actions.',
  failures,
);

const cbcPoliciesPath = 'app/plugins/cbc/components/reportPolicies/CbcReportPoliciesPage.tsx';
const cbcPoliciesSource = readRepoFile(cbcPoliciesPath);
assertContains(
  cbcPoliciesPath,
  cbcPoliciesSource,
  /<ReportPrepareTermSheet[\s\S]*autoPrepareKey=\{prepareAutoRunKey\}/,
  'CBC policy recommendation actions must use the foreground prepare sheet.',
  failures,
);
assertNotContains(
  cbcPoliciesPath,
  cbcPoliciesSource,
  /setSetupError\(resolveReportError\(caught,[\s\S]*recommended report setup fix/,
  'CBC policy recommendation action errors must not route to the page-level setup banner.',
  failures,
);

for (const [key, entry] of Object.entries(baseline)) {
  failures.push(...validateBaselineEntry(key, entry, today));
  const currentCount = findings.get(key) ?? 0;
  if (entry && typeof entry === 'object' && Number.isInteger(entry.count) && currentCount < entry.count) {
    suggestions.push(`${key} dropped from ${entry.count} to ${currentCount}; update or remove this baseline entry.`);
  }
}

for (const [key, count] of findings.entries()) {
  const baselineEntry = baseline[key];
  if (!baselineEntry) {
    failures.push(`${key} has ${count} finding(s) and is not in the error-placement baseline.`);
    continue;
  }
  if (count > baselineEntry.count) {
    failures.push(`${key} increased from baseline ${baselineEntry.count} to ${count}.`);
  }
}

if (failures.length > 0) {
  console.error('Error placement guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

if (suggestions.length > 0) {
  console.log('Error placement baseline can be reduced:');
  suggestions.forEach((suggestion) => console.log(`- ${suggestion}`));
}

const activeBaseline = Object.entries(baseline)
  .filter(([key, entry]) => (findings.get(key) ?? 0) > 0 && entry.count > 0)
  .length;

console.log(`Error placement guard passed. Active baseline entries: ${activeBaseline}.`);

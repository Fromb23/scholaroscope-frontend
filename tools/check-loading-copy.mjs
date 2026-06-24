import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'app');
const errors = [];
const warnings = [];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules'
        || entry.name === '.next'
        || fullPath.includes(`${path.sep}app${path.sep}components${path.sep}ui${path.sep}loading`)
        || entry.name === '__snapshots__'
      ) {
        return [];
      }
      return walk(fullPath);
    }
    if (!/\.(tsx|ts)$/.test(entry.name)) return [];
    if (/\.snap\.(tsx|ts)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function rel(file) {
  return path.relative(root, file);
}

function lineFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function hasMeaningfulMessage(attrs) {
  const messageMatch = attrs.match(/\bmessage\s*=\s*(?:"([^"]+)"|'([^']+)'|\{`([^`]+)`\}|\{([^}]+)\})/);
  if (!messageMatch) return false;
  const literal = messageMatch.slice(1, 4).find(Boolean);
  if (!literal) return true;
  return !/^\s*(Loading|Loading\.{3}|Processing|Please wait)\s*$/i.test(literal);
}

for (const file of walk(scanRoot)) {
  if (!statSync(file).isFile()) continue;
  const source = readFileSync(file, 'utf8');
  const relative = rel(file);

  for (const match of source.matchAll(/(["'`])Loading\.\.\.\1/g)) {
    errors.push(`${relative}:${lineFor(source, match.index)} uses raw "Loading..."`);
  }

  for (const match of source.matchAll(/(["'`])Processing\.\.\.\1/g)) {
    errors.push(`${relative}:${lineFor(source, match.index)} uses raw "Processing..."`);
  }

  for (const match of source.matchAll(/<LoadingSpinner\b([\s\S]*?)(?:\/>|>)/g)) {
    const attrs = match[1] ?? '';
    if (!hasMeaningfulMessage(attrs)) {
      errors.push(`${relative}:${lineFor(source, match.index)} renders LoadingSpinner without a meaningful message`);
    }
    if (
      /\bfullScreen(?:=\{true\}|=["']true["']|\s|$)/.test(attrs)
      && /app\/(core\/components|plugins)\//.test(relative)
      && !hasMeaningfulMessage(attrs)
    ) {
      warnings.push(`${relative}:${lineFor(source, match.index)} uses fullScreen LoadingSpinner without clear operation copy`);
    }
  }

  for (const match of source.matchAll(/<DataTable\b[\s\S]*?(?:\/>|<\/DataTable>)/g)) {
    const tag = match[0];
    if (/\bloading\s*=/.test(tag) && !/\bloadingMessage\s*=/.test(tag)) {
      errors.push(`${relative}:${lineFor(source, match.index)} uses DataTable loading without loadingMessage`);
    }
  }

  const containsPendingState = /\b(loading|submitting|isSubmitting|isPending|isLoading)\b/.test(source);
  if (containsPendingState) {
    for (const match of source.matchAll(/<Button\b[\s\S]{0,1000}?\{\s*[^?{}]+?\?\s*\(?\s*<(?:Loader2|LoadingSpinner)\b[^>]*\/>\s*\)?\s*:\s*[\s\S]{0,200}?<\/Button>/g)) {
      errors.push(`${relative}:${lineFor(source, match.index)} has a pending button branch that renders only a spinner`);
    }
  }
}

if (warnings.length > 0) {
  console.warn('Loading copy warnings:\n');
  for (const warning of warnings) {
    console.warn(`* ${warning}`);
  }
  console.warn('');
}

if (errors.length > 0) {
  console.error('Loading copy check failed:\n');
  for (const error of errors) {
    console.error(`* ${error}`);
  }
  process.exit(1);
}

console.log('Loading copy check passed.');

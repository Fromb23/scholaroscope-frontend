import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const rootArgIndex = process.argv.indexOf('--root');
const root = rootArgIndex >= 0
  ? path.resolve(process.argv[rootArgIndex + 1])
  : process.cwd();
const scanRoot = path.join(root, 'app');
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'coverage', 'dist', 'build', '.git'].includes(entry.name)) return [];
      return walk(file);
    }
    if (!/\.(?:ts|tsx)$/.test(entry.name) || /\.test\.(?:ts|tsx)$/.test(entry.name)) return [];
    return [file];
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function hasCanonicalDestinationParser(source) {
  return /\b(?:parseAppDestination|sanitizeAppDestination|isSafeNextPath|sanitizeInternalReturnTo|resolveReportBackHref|getLearnerCreateReturnTo|getLearnerProfileBackTarget)\s*\(/.test(source);
}

for (const file of walk(scanRoot)) {
  const relative = path.relative(root, file);
  const source = readFileSync(file, 'utf8');

  for (const match of source.matchAll(/\bextractErrorMessage\b/g)) {
    failures.push(`${relative}:${lineNumber(source, match.index)} uses retired extractErrorMessage.`);
  }

  for (const match of source.matchAll(/(?:set[A-Z][A-Za-z]*Error|message\s*=)\s*\(?(?:error|err)\.response(?:\?\.)?\.data/g)) {
    failures.push(`${relative}:${lineNumber(source, match.index)} renders raw response data.`);
  }

  const consumesDestination = (
    /searchParams\.get\(\s*['"](?:next|returnTo|redirect)['"]\s*\)/.test(source)
    && /(?:href=\{|router\.(?:push|replace)\(|window\.location\.(?:assign|replace)\()/.test(source)
  );
  if (consumesDestination && !hasCanonicalDestinationParser(source)) {
    failures.push(`${relative} consumes next/returnTo without the canonical destination parser.`);
  }

  for (const match of source.matchAll(/(?:next|returnTo|redirect)[A-Za-z]*\??\.startsWith\(\s*['"]\/['"]\s*\)/g)) {
    failures.push(`${relative}:${lineNumber(source, match.index)} validates a destination with startsWith('/').`);
  }
}

const navigationPath = path.join(root, 'app/core/auth/navigation.ts');
if (readFileSync(navigationPath, 'utf8').match(/decodeURIComponent/g)?.length < 1) {
  failures.push('app/core/auth/navigation.ts must inspect encoded destinations.');
}

if (failures.length > 0) {
  console.error('Security presentation check failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Security presentation check passed.');

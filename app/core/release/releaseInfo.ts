export interface ReleaseInfo {
  version: string;
  displayVersion: string;
  gitSha?: string;
  shortSha?: string;
  channel?: string;
  buildTime?: string;
  isDev: boolean;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function formatReleaseVersion(version: string): string {
  const normalized = version.trim();
  if (!normalized || normalized === 'dev') {
    return 'dev';
  }
  return normalized.startsWith('v') ? normalized : `v${normalized}`;
}

export function getReleaseInfo(): ReleaseInfo {
  const version = readEnv('NEXT_PUBLIC_APP_VERSION') ?? 'dev';
  const gitSha = readEnv('NEXT_PUBLIC_GIT_SHA');

  return {
    version,
    displayVersion: formatReleaseVersion(version),
    gitSha,
    shortSha: gitSha?.slice(0, 7),
    channel: readEnv('NEXT_PUBLIC_RELEASE_CHANNEL'),
    buildTime: readEnv('NEXT_PUBLIC_BUILD_TIME'),
    isDev: version === 'dev',
  };
}

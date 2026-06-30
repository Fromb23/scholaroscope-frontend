import { getReleaseInfo } from './releaseInfo';

interface ReleaseBadgeProps {
  productName?: string;
  className?: string;
}

export function ReleaseBadge({
  productName = 'ScholaroScope',
  className = '',
}: ReleaseBadgeProps) {
  const release = getReleaseInfo();
  const details = [
    release.channel,
    release.shortSha ? `sha ${release.shortSha}` : null,
    release.buildTime,
  ].filter(Boolean).join(' | ');

  return (
    <span
      className={className}
      title={details || undefined}
      aria-label={`${productName} ${release.displayVersion}`}
    >
      {productName} {release.displayVersion}
    </span>
  );
}

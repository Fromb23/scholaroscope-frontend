import { User } from 'lucide-react';
import type { ReactNode } from 'react';

export interface LearnerIdentityHeaderProps {
  name: string;
  admissionNumber?: string | null;
  cohortName?: string | null;
  workspaceName?: string | null;
  profileImageUrl?: string | null;
  title?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}

export function LearnerIdentityHeader({
  name,
  admissionNumber,
  cohortName,
  workspaceName,
  profileImageUrl,
  title,
  icon,
  badge,
  actions,
}: LearnerIdentityHeaderProps) {
  const context = [workspaceName, cohortName].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="theme-info-surface flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full sm:h-24 sm:w-24"
          aria-label="Learner profile image"
        >
          {profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-10 w-10 text-blue-600 sm:h-12 sm:w-12" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          {title ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {icon}
              <p className="text-sm font-semibold uppercase tracking-wide theme-subtle">{title}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold theme-text sm:text-3xl">{name}</h1>
            {badge}
          </div>
          {admissionNumber ? (
            <p className="mt-2 text-sm theme-muted">Admission {admissionNumber}</p>
          ) : null}
          {context ? (
            <p className="mt-1 text-sm theme-subtle">{context}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}

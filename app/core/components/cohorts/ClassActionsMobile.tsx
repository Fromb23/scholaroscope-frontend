import Link from 'next/link';
import {
  BookOpen,
  Calculator,
  CalendarCheck,
  CheckSquare,
  ClipboardList,
  FileBarChart,
  FileText,
  LineChart,
  Settings2,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ActionMenuItem } from '@/app/components/ui/ActionMenu';
import {
  splitCohortSubjectMobileActions,
  type CohortSubjectActionMobileGroup,
  type CohortSubjectActionMobileIcon,
} from '@/app/core/components/academic/cohorts/cohortSubjectActions';

export interface ClassActionsMobileItem extends ActionMenuItem {
  mobileGroup?: CohortSubjectActionMobileGroup;
  mobileIcon?: CohortSubjectActionMobileIcon;
  mobileLabel?: string;
}

interface ClassActionsMobileProps {
  actions: ClassActionsMobileItem[];
  subjectName: string;
}

const mobileActionIcons: Record<CohortSubjectActionMobileIcon, LucideIcon> = {
  assignments: ClipboardList,
  assessments: CheckSquare,
  calculator: Calculator,
  'cbc-content': BookOpen,
  'cbc-progress': LineChart,
  instructor: UserCog,
  learners: Users,
  lesson: FileText,
  record: CalendarCheck,
  report: FileBarChart,
  'report-rules': Settings2,
  scheme: BookOpen,
};

function getActionClasses(group: CohortSubjectActionMobileGroup) {
  if (group === 'daily') {
    return 'min-h-16 border-blue-100 bg-white text-gray-900 shadow-sm active:bg-blue-50';
  }

  return 'min-h-11 border-gray-200 bg-white text-gray-700 active:bg-gray-100';
}

function ClassActionTile({
  action,
  subjectName,
}: {
  action: ClassActionsMobileItem;
  subjectName: string;
}) {
  const group = action.mobileGroup ?? 'setup';
  const Icon = mobileActionIcons[action.mobileIcon ?? 'scheme'];
  const label = action.mobileLabel ?? action.label;
  const className = [
    'theme-focus-ring flex w-full items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors',
    getActionClasses(group),
    action.disabled ? 'pointer-events-none opacity-50' : '',
  ].join(' ');
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 leading-tight">{label}</span>
    </>
  );

  if (action.href && !action.disabled) {
    return (
      <Link
        href={action.href}
        className={className}
        aria-label={`${action.label} for ${subjectName}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={action.disabled}
      aria-label={`${action.label} for ${subjectName}`}
      onClick={action.onSelect}
    >
      {content}
    </button>
  );
}

export function ClassActionsMobile({ actions, subjectName }: ClassActionsMobileProps) {
  const visibleActions = actions.filter((action) => Boolean(action.label) && (action.href || action.onSelect));
  const { daily, setup } = splitCohortSubjectMobileActions(visibleActions);

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 md:hidden">
      {daily.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {daily.map((action) => (
            <ClassActionTile
              key={`${action.label}:${action.href ?? 'action'}`}
              action={action}
              subjectName={subjectName}
            />
          ))}
        </div>
      ) : null}

      {setup.length > 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
            <Settings2 className="h-3.5 w-3.5" />
            Class setup
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {setup.map((action) => (
              <ClassActionTile
                key={`${action.label}:${action.href ?? 'action'}`}
                action={action}
                subjectName={subjectName}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

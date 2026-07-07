import type { HTMLAttributes, ReactNode } from 'react';

type MobileColumns = 1 | 2;
type DesktopColumns = 1 | 2 | 3 | 4 | 5;
type StatStripGap = 'tight' | 'normal' | 'wide';

interface StatStripProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  mobileColumns?: MobileColumns;
  mdColumns?: DesktopColumns;
  lgColumns?: DesktopColumns;
  xlColumns?: DesktopColumns;
  gap?: StatStripGap;
}

const mobileColumnClasses: Record<MobileColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
};

const mdColumnClasses: Record<DesktopColumns, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

const lgColumnClasses: Record<DesktopColumns, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};

const xlColumnClasses: Record<DesktopColumns, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
};

const gapClasses: Record<StatStripGap, string> = {
  tight: 'gap-3',
  normal: 'gap-3 md:gap-4',
  wide: 'gap-3 md:gap-6',
};

export function StatStrip({
  children,
  className = '',
  mobileColumns = 2,
  mdColumns = 2,
  lgColumns,
  xlColumns,
  gap = 'normal',
  ...props
}: StatStripProps) {
  const classes = [
    'grid',
    mobileColumnClasses[mobileColumns],
    mdColumnClasses[mdColumns],
    lgColumns ? lgColumnClasses[lgColumns] : null,
    xlColumns ? xlColumnClasses[xlColumns] : null,
    gapClasses[gap],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

import type { ReactNode } from 'react';

import { DashboardClientShell } from './DashboardClientShell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardClientShell>{children}</DashboardClientShell>;
}

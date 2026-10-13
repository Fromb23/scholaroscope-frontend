import type { Metadata } from 'next';

import { ProjectDetailPage } from '@/app/core/components/projects/ProjectDetailPage';

export const metadata: Metadata = {
  title: 'Project',
};

export default function Page() {
  return <ProjectDetailPage />;
}

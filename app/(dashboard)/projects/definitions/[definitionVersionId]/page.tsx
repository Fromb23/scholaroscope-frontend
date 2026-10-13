import type { Metadata } from 'next';
import { ProjectStreamSelectionPage } from '@/app/core/components/projects/ProjectStreamSelectionPage';

export const metadata: Metadata = {
  title: 'Project Streams',
};

export default function Page() {
  return <ProjectStreamSelectionPage />;
}

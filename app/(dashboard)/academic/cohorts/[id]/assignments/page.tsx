import type { Metadata } from 'next';
import CohortAssignmentsPage from '@/app/core/components/assignments/CohortAssignmentsPage';

export const metadata: Metadata = {
    title: 'Assignments',
};

export default function Page() {
    return <CohortAssignmentsPage />;
}

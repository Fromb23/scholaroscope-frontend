import type { Metadata } from 'next';
import { InstructorManagementPage } from '@/app/core/components/admin/instructors/InstructorManagementPage';

export const metadata: Metadata = {
    title: 'Staff',
};

export default function Page() {
    return <InstructorManagementPage />;
}

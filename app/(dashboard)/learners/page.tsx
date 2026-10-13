import type { Metadata } from 'next';
import LearnersPage from '@/app/core/components/learners/LearnersPage';

export const metadata: Metadata = {
    title: 'Learners',
};

export default function Page() {
    return <LearnersPage />;
}

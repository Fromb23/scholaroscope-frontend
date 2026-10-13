import type { Metadata } from 'next';
import { CohortsPage } from '@/app/core/components/academic/cohorts/CohortsPage';

export const metadata: Metadata = {
    title: 'Classes',
};

export default function Page() {
    return <CohortsPage />;
}

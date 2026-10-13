import type { Metadata } from 'next';
import { SchemesPage } from '@/app/plugins/schemes/components/SchemesPage';

export const metadata: Metadata = {
    title: 'Schemes of Work',
};

export default function Page() {
    return <SchemesPage />;
}

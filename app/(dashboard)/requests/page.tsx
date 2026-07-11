import { InternalRequestsRoutePage } from '@/app/core/components/requests/InternalRequestsRoutePage';
import { RequestsPage } from '@/app/plugins/requests/components/RequestsPage';

export default function Page() {
    return <InternalRequestsRoutePage Component={RequestsPage} />;
}

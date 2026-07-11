import { InternalRequestsRoutePage } from '@/app/core/components/requests/InternalRequestsRoutePage';
import { NewRequestPage } from '@/app/plugins/requests/components/NewRequestPage';

export default function Page() {
    return <InternalRequestsRoutePage Component={NewRequestPage} />;
}

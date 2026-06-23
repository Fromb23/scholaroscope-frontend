import { AdminPendingApprovalsWidget } from '@/app/plugins/requests/components/AdminPendingApprovalsWidget';
import { registerSlotContent } from '@/app/core/registry/slots';

registerSlotContent('admin.dashboard.pendingApprovals', <AdminPendingApprovalsWidget />);

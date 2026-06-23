import { registerProfileExtension } from '@/app/core/registry/profileExtensions';
import { ProfileRequestsExtension } from '@/app/plugins/requests/components/ProfileRequestsExtension';

registerProfileExtension({
    key: 'requests-profile-extension',
    priority: 10,
    supports: () => true,
    Component: ProfileRequestsExtension,
});

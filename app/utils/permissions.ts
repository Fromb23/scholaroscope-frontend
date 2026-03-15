import { Role } from '@/app/core/types/auth';

export type Capability =
    | 'CREATE_LEARNER'
    | 'EDIT_LEARNER'
    | 'MANAGE_ENROLLMENT'
    | 'VIEW_REPORTS'
    | 'AUTHOR_CBC';

const roleCapabilities: Record<Role, Capability[]> = {
    SUPERADMIN: [
        'CREATE_LEARNER',
        'EDIT_LEARNER',
        'MANAGE_ENROLLMENT',
        'VIEW_REPORTS',
        'AUTHOR_CBC'
    ],
    ADMIN: [
        'CREATE_LEARNER',
        'EDIT_LEARNER',
        'MANAGE_ENROLLMENT',
        'VIEW_REPORTS',
        'AUTHOR_CBC'
    ],
    INSTRUCTOR: [] // instructors have view-only learner permissions
};

export function hasCapability(
    role: Role,
    capability: Capability
): boolean {
    return roleCapabilities[role]?.includes(capability) ?? false;
}

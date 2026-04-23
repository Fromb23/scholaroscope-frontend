export const academicKeys = {
    curricula: {
        all: ['academic', 'curricula'] as const,
        list: (organizationId: number | null) =>
            ['academic', 'curricula', 'list', organizationId] as const,
    },
} as const;

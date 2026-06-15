import type { CbcCohortAllowedSubjects } from '@/app/core/types/cbcPathways';

export interface RegisteredCbcPathwayApi {
    getCohortAllowedSubjects(cohortId: number): Promise<CbcCohortAllowedSubjects>;
}

let registeredApi: RegisteredCbcPathwayApi | null = null;

export function registerCbcPathwayApi(api: RegisteredCbcPathwayApi): void {
    registeredApi = api;
}

export function getRegisteredCbcPathwayApi(): RegisteredCbcPathwayApi | null {
    return registeredApi;
}

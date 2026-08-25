import { registerPluginProvider } from '@/app/core/registry/pluginProviderRegistry';
import { registerAssessmentObjectiveProvider } from '@/app/core/registry/assessmentObjectiveProviders';
import { registerLessonPlanOutcomeProvider } from '@/app/core/registry/lessonPlanOutcomeProviders';
import { registerCbcPathwayApi } from '@/app/core/registry/cbcPathwayRegistry';
import { CBCProvider } from '@/app/plugins/cbc/context/CBCContext';
import { cbcPathwayAPI } from '@/app/plugins/cbc/api/pathways';
import { CbcLessonPlanOutcomeSelector } from '@/app/plugins/cbc/components/lessonPlans/CbcLessonPlanOutcomeSelector';
import { CbcReferencePagesEditor } from '@/app/plugins/cbc/components/lessonPlans/CbcReferencePagesEditor';
import { CbcAssessmentObjectiveSelector } from '@/app/plugins/cbc/components/assessments/CbcAssessmentObjectiveSelector';

registerPluginProvider('cbc', CBCProvider);
registerCbcPathwayApi({
    getCohortAllowedSubjects: cbcPathwayAPI.getCohortAllowedSubjects,
});
registerAssessmentObjectiveProvider({
    provider: 'cbc',
    ObjectiveSelector: CbcAssessmentObjectiveSelector,
});
registerLessonPlanOutcomeProvider({
    provider: 'cbc',
    OutcomeSelector: CbcLessonPlanOutcomeSelector,
    ReferenceEditor: CbcReferencePagesEditor,
});

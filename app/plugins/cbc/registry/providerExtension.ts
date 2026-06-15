import { registerPluginProvider } from '@/app/core/registry/pluginProviderRegistry';
import { registerLessonPlanOutcomeProvider } from '@/app/core/registry/lessonPlanOutcomeProviders';
import { registerCbcPathwayApi } from '@/app/core/registry/cbcPathwayRegistry';
import { CBCProvider } from '@/app/plugins/cbc/context/CBCContext';
import { cbcPathwayAPI } from '@/app/plugins/cbc/api/pathways';
import { CbcLessonPlanOutcomeSelector } from '@/app/plugins/cbc/components/lessonPlans/CbcLessonPlanOutcomeSelector';
import { CbcReferencePagesEditor } from '@/app/plugins/cbc/components/lessonPlans/CbcReferencePagesEditor';

registerPluginProvider('cbc', CBCProvider);
registerCbcPathwayApi({
    getCohortAllowedSubjects: cbcPathwayAPI.getCohortAllowedSubjects,
});
registerLessonPlanOutcomeProvider({
    provider: 'cbc',
    OutcomeSelector: CbcLessonPlanOutcomeSelector,
    ReferenceEditor: CbcReferencePagesEditor,
});

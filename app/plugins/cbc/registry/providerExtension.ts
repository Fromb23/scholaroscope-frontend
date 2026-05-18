import { registerPluginProvider } from '@/app/core/registry/pluginProviderRegistry';
import { registerLessonPlanOutcomeProvider } from '@/app/core/registry/lessonPlanOutcomeProviders';
import { CBCProvider } from '@/app/plugins/cbc/context/CBCContext';
import { CbcLessonPlanOutcomeSelector } from '@/app/plugins/cbc/components/lessonPlans/CbcLessonPlanOutcomeSelector';
import { CbcReferencePagesEditor } from '@/app/plugins/cbc/components/lessonPlans/CbcReferencePagesEditor';

registerPluginProvider('cbc', CBCProvider);
registerLessonPlanOutcomeProvider({
    provider: 'cbc',
    OutcomeSelector: CbcLessonPlanOutcomeSelector,
    ReferenceEditor: CbcReferencePagesEditor,
});

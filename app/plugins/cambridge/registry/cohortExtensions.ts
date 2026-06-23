import { registerCohortDetailCardExtension } from '@/app/core/registry/cohortDetailCards';
import { registerCohortQuickActionHook } from '@/app/core/registry/cohortQuickActions';
import { isCambridgeCurriculumType } from '@/app/core/lib/curriculumBridge';
import { CambridgeCohortDetailCards } from '@/app/plugins/cambridge/components/CambridgeCohortDetailCards';
import { useCambridgeCohortQuickAction } from '@/app/plugins/cambridge/lib/cohortQuickAction';

registerCohortQuickActionHook(useCambridgeCohortQuickAction);

registerCohortDetailCardExtension({
    key: 'cambridge-cohort-detail-cards',
    priority: 10,
    supports: (context) => isCambridgeCurriculumType(context.curriculumType ?? null),
    Component: CambridgeCohortDetailCards,
});

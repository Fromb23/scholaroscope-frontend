import { createElement } from 'react';
import { isCambridgeCurriculum } from '@/app/core/lib/curriculumBridge';
import { registerCohortSubjectPanelExtension } from '@/app/core/registry/cohortSubjectPanels';
import { CambridgeCohortSubjectPanel } from '@/app/plugins/cambridge/components/CambridgeCohortSubjectPanel';

registerCohortSubjectPanelExtension({
    key: 'cambridge-cohort-subject-panel',
    priority: 10,
    supports: (context) => isCambridgeCurriculum({ curriculum_type: context.curriculumType }),
    render: (context) => createElement(CambridgeCohortSubjectPanel, context),
});

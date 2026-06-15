import { createElement } from 'react';
import { registerCohortSubjectPanelExtension } from '@/app/core/registry/cohortSubjectPanels';
import { isCbcSeniorSchoolEntity } from '@/app/core/lib/cbcSeniorSchool';
import { CBCCohortSubjectPanel } from '@/app/plugins/cbc/components/CBCCohortSubjectPanel';

registerCohortSubjectPanelExtension({
  key: 'cbc-cohort-subject-panel',
  priority: 20,
  supports: (context) => isCbcSeniorSchoolEntity({
    curriculum_type: context.curriculumType,
    level: context.cohortLevel,
  }),
  render: (context) => createElement(CBCCohortSubjectPanel, context),
});

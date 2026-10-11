import { createElement } from 'react';
import { registerCohortCurriculumSetupModal } from '@/app/core/registry/cohortCurriculumSetupModal';
import { CbcPathwayConfigurationModal } from '@/app/plugins/cbc/components/CbcPathwayConfigurationModal';

registerCohortCurriculumSetupModal((context) => (
  createElement(CbcPathwayConfigurationModal, context)
));

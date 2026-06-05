import { createElement } from 'react';
import { registerCohortSubjectPanelExtension } from '@/app/core/registry/cohortSubjectPanels';
import { CBCCohortSubjectPanel } from '@/app/plugins/cbc/components/CBCCohortSubjectPanel';

function isCbcSeniorLevel(level: string): boolean {
  const normalized = level.replace(/\s+/g, '').toLowerCase();
  return normalized === 'grade10' || normalized === 'grade11' || normalized === 'grade12';
}

registerCohortSubjectPanelExtension({
  key: 'cbc-cohort-subject-panel',
  priority: 20,
  supports: (context) => context.curriculumType === 'CBE' && isCbcSeniorLevel(context.cohortLevel),
  render: (context) => createElement(CBCCohortSubjectPanel, context),
});

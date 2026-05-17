import { registerAssessmentPolicyPreviewExtension } from '@/app/core/registry/assessmentPolicyPreviews';
import { isCbcCurriculum } from '@/app/core/lib/policySurfaces';
import { CbcAssessmentPolicyPreview } from '@/app/plugins/cbc/components/reportPolicies/CbcAssessmentPolicyPreview';

registerAssessmentPolicyPreviewExtension({
    key: 'cbc-assessment-policy-preview',
    priority: 10,
    supports: ({ subject }) => isCbcCurriculum(subject),
    render: (context) => <CbcAssessmentPolicyPreview {...context} />,
});

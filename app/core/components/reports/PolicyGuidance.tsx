import Link from 'next/link';
import { Button } from '@/app/components/ui/Button';

export function PolicyHierarchyGuide() {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <p className="font-medium text-gray-900">
                Scholaroscope uses the most specific active policy available:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Class subject + term</li>
                <li>Class subject</li>
                <li>Class + term</li>
                <li>Class</li>
                <li>Registered subject / level</li>
                <li>Workspace default</li>
            </ol>
            <p className="mt-2 font-medium text-gray-900">
                Inactive policies are saved but not used.
            </p>
        </div>
    );
}

export function PolicyScopeMeaningGuide() {
    return (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            <p className="font-medium text-gray-900">Selected-scope meaning</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
                <p><span className="font-medium text-gray-900">Workspace default:</span> fallback for the organization</p>
                <p><span className="font-medium text-gray-900">Class policy:</span> applies to all subjects in this class unless overridden</p>
                <p><span className="font-medium text-gray-900">Class subject policy:</span> applies only to this subject in this class</p>
                <p><span className="font-medium text-gray-900">Term policy:</span> applies only during the selected term</p>
            </div>
        </div>
    );
}

export function GuidedPolicySetup() {
    return (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-medium">Guided policy setup</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
                <p>What should this policy apply to?</p>
                <p>What should count in the final report?</p>
                <p>What must exist before the report becomes final?</p>
                <p>How should repeated evidence be combined?</p>
            </div>
        </div>
    );
}

interface InactivePolicyNoticeProps {
    activating?: boolean;
    canActivate?: boolean;
    onActivate?: () => void;
    onCreateActiveCopy?: () => void;
    backHref?: string;
    backLabel?: string;
}

export function InactivePolicyNotice({
    activating = false,
    canActivate = true,
    onActivate,
    onCreateActiveCopy,
    backHref,
    backLabel = 'Back to active policies',
}: InactivePolicyNoticeProps) {
    return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-medium">
                This policy is inactive. It is saved but will not be used in report computation.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                {onActivate ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!canActivate || activating}
                        onClick={onActivate}
                    >
                        {activating ? 'Activating...' : 'Activate policy'}
                    </Button>
                ) : null}
                {onCreateActiveCopy ? (
                    <Button type="button" size="sm" variant="secondary" onClick={onCreateActiveCopy}>
                        Create new active policy from this one
                    </Button>
                ) : null}
                {backHref ? (
                    <Link href={backHref}>
                        <Button type="button" size="sm" variant="ghost">
                            {backLabel}
                        </Button>
                    </Link>
                ) : null}
                <Button type="button" size="sm" variant="ghost" disabled>
                    Recompute support requires backend activation workflow.
                </Button>
            </div>
        </div>
    );
}

// app/plugins/cbc/components/evidence/EvidenceSuccessBanner.tsx
import { CheckCircle, X } from 'lucide-react';

interface Props {
    count: number;
    onDismiss: () => void;
}

export function EvidenceSuccessBanner({ count, onDismiss }: Props) {
    return (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-700 font-medium flex-1">
                Evidence recorded for {count} learner{count !== 1 ? 's' : ''}
            </p>
            <button onClick={onDismiss} className="text-green-400 hover:text-green-600">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
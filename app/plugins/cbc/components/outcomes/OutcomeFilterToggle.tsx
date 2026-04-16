// app/plugins/cbc/components/outcomes/OutcomeFilterToggle.tsx
import type { OutcomeFilter } from '@/app/plugins/cbc/hooks/useSessionOutcomes';

interface Props {
    filter: OutcomeFilter;
    onChange: (f: OutcomeFilter) => void;
    total: number;
    needsEvidence: number;
    covered: number;
}

export function OutcomeFilterToggle({ filter, onChange, total, needsEvidence, covered }: Props) {
    const tabs: { key: OutcomeFilter; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: total },
        { key: 'needs_evidence', label: 'Needs Evidence', count: needsEvidence },
        { key: 'covered', label: 'Covered', count: covered },
    ];

    return (
        <div className="flex gap-2 flex-wrap">
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    {tab.label} ({tab.count})
                </button>
            ))}
        </div>
    );
}
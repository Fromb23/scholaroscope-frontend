import { CheckCircle2 } from 'lucide-react';

import type { CommercialCapability } from '@/app/core/types/commercialCatalog';

interface CapabilityListProps {
  capabilities: CommercialCapability[];
}

export function CapabilityList({ capabilities }: CapabilityListProps) {
  if (capabilities.length === 0) {
    return <p className="theme-subtle text-sm">No public capability copy is available for this selection yet.</p>;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {capabilities.map((capability) => (
        <div key={capability.key} className="flex gap-2 rounded-md border theme-border p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-medium theme-text">{capability.name}</p>
            <p className="theme-subtle text-xs">{capability.short_description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
